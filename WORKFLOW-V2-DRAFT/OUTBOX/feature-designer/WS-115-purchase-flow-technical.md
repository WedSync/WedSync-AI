# WS-115: Purchase Flow - Technical Specification

## Feature Overview
**Feature ID:** WS-115  
**Feature Name:** Purchase Flow  
**Team Assignment:** Team C (Integration)  
**Dependencies:** WS-076 (Stripe Payment Setup)  
**Status:** Technical Specification Complete  
**Priority:** High (Critical Path - Revenue Generation)

## User Stories with Wedding Context

### 💳 Story 1: Instant Template Purchase
**As a** busy wedding coordinator managing 8 events this month  
**I want to** purchase a "venue communication template" in under 2 minutes with saved payment details  
**So that I can** immediately start using proven forms for my luxury venue client without workflow interruption  

**Wedding Context:** During peak season, coordinators work 12-hour days and need instant access to templates. Any purchase flow longer than 2 minutes risks losing the sale as they juggle multiple client needs.

### 📱 Story 2: Mobile Purchase During Site Visit  
**As a** destination wedding coordinator at a venue walkthrough  
**I want to** purchase and immediately install a "venue requirements checklist" template on my mobile device  
**So that I can** use the template during the current venue meeting to capture all necessary details  

**Wedding Context:** Venue site visits are time-sensitive and coordinators often need specific templates immediately. Mobile purchase must work seamlessly even with spotty venue WiFi.

### 🔄 Story 3: Bulk Template Purchase
**As a** new wedding coordinator building my template library  
**I want to** purchase a "complete coordinator starter bundle" with multiple related templates at a discount  
**So that I can** launch my business with a professional suite of proven templates at a better price point  

**Wedding Context:** New coordinators need comprehensive template sets but have limited budgets. Bundle purchasing with discounts is crucial for business launches.

### ⚡ Story 4: Emergency Template Access
**As a** wedding coordinator whose template system crashed 3 days before a wedding  
**I want to** instantly purchase and install a "3-day emergency timeline template" with one-click payment  
**So that I can** recover critical client communications and maintain professional service standards  

**Wedding Context:** Wedding timeline emergencies require immediate template access. Payment failures or installation delays could cause client disasters and reputation damage.

### 🎯 Story 5: Subscription-Based Access
**As a** high-volume wedding coordinator (30+ weddings/year)  
**I want to** purchase premium marketplace access that includes unlimited template downloads  
**So that I can** access any template instantly without per-purchase friction during busy seasons  

**Wedding Context:** Enterprise coordinators need different pricing models - per-template purchasing becomes expensive and creates workflow friction when managing large client volumes.

### 📊 Story 6: Purchase with Approval Workflow
**As a** wedding planning agency coordinator requiring manager approval for purchases over $50  
**I want to** initiate template purchases that route to my manager for approval and payment  
**So that I can** access needed templates while maintaining company purchasing policies  

**Wedding Context:** Agency coordinators often need approval for purchases but can't wait days for templates. The flow needs to support both individual and team purchasing workflows.

## Database Schema Design

```sql
-- Purchase transactions with wedding business context
CREATE TABLE marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES marketplace_templates(id),
    buyer_id UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Purchase details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    platform_commission_cents INTEGER NOT NULL,
    creator_payout_cents INTEGER NOT NULL,
    
    -- Wedding context
    purchase_urgency VARCHAR(20) DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'
    intended_wedding_count INTEGER, -- How many weddings buyer plans to use this for
    wedding_season_context VARCHAR(20), -- Which season they're purchasing for
    
    -- Payment processing
    payment_intent_id VARCHAR(255), -- Stripe PaymentIntent ID
    payment_method_id VARCHAR(255), -- Stripe PaymentMethod ID
    payment_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'canceled'
    payment_error_code VARCHAR(50), -- Stripe error code if failed
    
    -- Purchase flow tracking
    purchase_status VARCHAR(30) DEFAULT 'created', -- 'created', 'payment_pending', 'paid', 'installing', 'completed', 'failed'
    checkout_started_at TIMESTAMPTZ,
    payment_completed_at TIMESTAMPTZ,
    installation_started_at TIMESTAMPTZ,
    installation_completed_at TIMESTAMPTZ,
    
    -- Installation results
    installed_successfully BOOLEAN DEFAULT false,
    installation_errors JSONB DEFAULT '[]',
    installed_components JSONB DEFAULT '{}', -- Track what was actually installed
    
    -- Business intelligence
    purchase_source VARCHAR(50), -- 'search', 'recommendation', 'direct_link', 'bundle'
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    user_agent TEXT,
    referrer_url TEXT,
    
    -- Subscription and bundling
    is_bundle_purchase BOOLEAN DEFAULT false,
    bundle_id UUID, -- Reference to bundle if applicable
    subscription_period_id UUID, -- If part of subscription
    discount_applied_cents INTEGER DEFAULT 0,
    discount_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle purchases for coordinators buying multiple templates
CREATE TABLE marketplace_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_name VARCHAR(100) NOT NULL,
    description TEXT,
    template_ids UUID[] NOT NULL, -- Array of included template IDs
    
    -- Pricing
    individual_total_cents INTEGER NOT NULL, -- Sum of individual template prices
    bundle_price_cents INTEGER NOT NULL, -- Actual bundle price
    discount_percentage DECIMAL(3,1) NOT NULL, -- e.g., 15.0 for 15% off
    
    -- Wedding targeting
    target_coordinator_types VARCHAR(50)[], -- ['luxury', 'destination', 'budget']
    target_wedding_sizes VARCHAR(30)[], -- ['intimate', 'medium', 'large']
    seasonal_promotion BOOLEAN DEFAULT false,
    
    -- Business rules
    minimum_tier_required VARCHAR(20) DEFAULT 'starter',
    max_purchases_per_user INTEGER, -- Limit bundle purchases
    
    -- Status
    active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase funnel analytics for conversion optimization
CREATE TABLE purchase_funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES user_profiles(id),
    template_id UUID REFERENCES marketplace_templates(id),
    
    -- Funnel stage tracking
    event_type VARCHAR(50) NOT NULL, -- 'template_view', 'preview_opened', 'checkout_started', 'payment_initiated', 'purchase_completed'
    funnel_position INTEGER NOT NULL, -- 1=view, 2=preview, 3=checkout, 4=payment, 5=completion
    
    -- Context data
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    time_on_step_seconds INTEGER, -- How long user spent on this step
    
    -- Purchase context
    purchase_intent VARCHAR(30), -- 'browsing', 'specific_need', 'emergency', 'bulk_buying'
    estimated_budget_range VARCHAR(30), -- 'under_50', '50_to_100', '100_to_250', 'over_250'
    
    -- Wedding business context
    coordinator_experience VARCHAR(20), -- 'new', 'experienced', 'expert'
    current_wedding_load INTEGER, -- How many active weddings
    time_pressure VARCHAR(20), -- 'none', 'moderate', 'high', 'emergency'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed purchase analysis for recovery
CREATE TABLE purchase_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES marketplace_purchases(id),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    template_id UUID NOT NULL REFERENCES marketplace_templates(id),
    
    -- Failure details
    failure_stage VARCHAR(30) NOT NULL, -- 'payment', 'installation', 'validation'
    failure_reason VARCHAR(100), -- Specific error message
    error_code VARCHAR(50), -- System error code
    stripe_error_code VARCHAR(50), -- Stripe-specific error
    
    -- Recovery tracking
    recovery_attempted BOOLEAN DEFAULT false,
    recovery_successful BOOLEAN DEFAULT false,
    recovery_method VARCHAR(50), -- 'retry_payment', 'different_card', 'manual_installation'
    
    -- Wedding context impact
    urgency_level VARCHAR(20), -- How urgent was this purchase for the coordinator
    client_impact_risk VARCHAR(20), -- 'none', 'low', 'high', 'critical'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription-based purchasing for high-volume coordinators
CREATE TABLE marketplace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    subscription_tier VARCHAR(30) NOT NULL, -- 'unlimited_monthly', 'premium_quarterly'
    
    -- Subscription details
    monthly_price_cents INTEGER NOT NULL,
    billing_cycle_days INTEGER NOT NULL, -- 30, 90, 365
    templates_per_period INTEGER, -- NULL for unlimited
    
    -- Stripe subscription
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Usage tracking
    templates_purchased_this_period INTEGER DEFAULT 0,
    total_value_accessed_cents INTEGER DEFAULT 0, -- Value of all templates accessed
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'unpaid'
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for purchase operations
CREATE INDEX idx_purchases_buyer_date ON marketplace_purchases(buyer_id, created_at DESC);
CREATE INDEX idx_purchases_template_date ON marketplace_purchases(template_id, created_at DESC);
CREATE INDEX idx_purchases_payment_intent ON marketplace_purchases(payment_intent_id);
CREATE INDEX idx_purchases_status ON marketplace_purchases(purchase_status, payment_status);
CREATE INDEX idx_funnel_events_session ON purchase_funnel_events(session_id, funnel_position);
CREATE INDEX idx_funnel_events_template ON purchase_funnel_events(template_id, event_type);

-- Row Level Security for purchase data
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own purchases" ON marketplace_purchases
    FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Users can create their own purchases" ON marketplace_purchases
    FOR INSERT WITH CHECK (buyer_id = auth.uid());

ALTER TABLE purchase_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own funnel events" ON purchase_funnel_events
    FOR SELECT USING (user_id = auth.uid());
```

## API Endpoints

### POST /api/marketplace/purchase/create-intent
```typescript
interface CreatePurchaseIntentRequest {
  templateId: string;
  purchaseContext: {
    urgency: 'normal' | 'urgent' | 'emergency';
    intendedWeddingCount?: number;
    weddingSeason?: 'spring' | 'summer' | 'fall' | 'winter';
    coordinatorExperience?: 'new' | 'experienced' | 'expert';
    currentWeddingLoad?: number;
  };
  bundleId?: string; // If purchasing as part of a bundle
  discountCode?: string;
}

interface CreatePurchaseIntentResponse {
  purchaseId: string;
  clientSecret: string; // Stripe PaymentIntent client secret
  amount: {
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    currency: string;
  };
  commission: {
    platformFeeCents: number;
    creatorPayoutCents: number;
  };
  template: {
    id: string;
    title: string;
    description: string;
    previewUrl: string;
    estimatedInstallTime: string;
    componentCount: number;
  };
  paymentOptions: {
    savePaymentMethod: boolean;
    allowedPaymentMethods: ('card' | 'apple_pay' | 'google_pay')[];
  };
  requirements: {
    tierAccess: boolean;
    monthlyLimit: { remaining: number; total: number } | null;
    conflictsWithExisting: boolean;
  };
}
```

### POST /api/marketplace/purchase/confirm
```typescript
interface ConfirmPurchaseRequest {
  purchaseId: string;
  paymentIntentId: string;
  installImmediately?: boolean; // Default true
}

interface ConfirmPurchaseResponse {
  purchaseId: string;
  status: 'payment_succeeded' | 'installation_started' | 'completed' | 'failed';
  installation?: {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    progress?: number; // 0-100
    estimatedTimeRemaining?: string;
    installedComponents: {
      forms: number;
      journeys: number;
      emailTemplates: number;
      documents: number;
    };
  };
  nextSteps: Array<{
    action: string;
    description: string;
    url?: string;
  }>;
}
```

### GET /api/marketplace/purchase/{purchaseId}/status
```typescript
interface PurchaseStatusResponse {
  purchase: {
    id: string;
    status: 'created' | 'payment_pending' | 'paid' | 'installing' | 'completed' | 'failed';
    template: {
      id: string;
      title: string;
      thumbnailUrl: string;
    };
    timing: {
      createdAt: string;
      paymentCompletedAt?: string;
      installationStartedAt?: string;
      installationCompletedAt?: string;
    };
  };
  installation?: {
    progress: number; // 0-100
    currentStep: string;
    timeRemaining: string;
    components: Array<{
      type: 'form' | 'journey' | 'email' | 'document';
      name: string;
      status: 'pending' | 'installing' | 'completed' | 'failed';
      error?: string;
    }>;
  };
  troubleshooting?: {
    commonIssues: Array<{
      issue: string;
      solution: string;
      contactSupport?: boolean;
    }>;
  };
}
```

### POST /api/marketplace/bundles/create-intent
```typescript
interface CreateBundleIntentRequest {
  bundleId: string;
  purchaseContext: {
    urgency: 'normal' | 'urgent' | 'emergency';
    coordinatorType: 'new' | 'experienced' | 'enterprise';
  };
}

interface CreateBundleIntentResponse {
  purchaseId: string;
  clientSecret: string;
  bundle: {
    id: string;
    name: string;
    description: string;
    templates: Array<{
      id: string;
      title: string;
      individualPriceCents: number;
    }>;
    pricing: {
      individualTotalCents: number;
      bundlePriceCents: number;
      savingsAmountCents: number;
      savingsPercentage: number;
    };
  };
  installationEstimate: {
    totalTimeMinutes: number;
    componentCount: number;
  };
}
```

## Frontend Components

### PurchaseFlowModal Component
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Check, AlertTriangle, Download, Play } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PurchaseFlowModalProps {
  template: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    thumbnailUrl: string;
    demoUrl?: string;
    estimatedSetupMinutes: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseId: string) => void;
}

type PurchaseStep = 'preview' | 'context' | 'payment' | 'processing' | 'installation' | 'complete' | 'error';

export function PurchaseFlowModal({ template, isOpen, onClose, onSuccess }: PurchaseFlowModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <PurchaseFlow template={template} isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />
    </Elements>
  );
}

function PurchaseFlow({ template, isOpen, onClose, onSuccess }: PurchaseFlowModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('preview');
  const [purchaseContext, setPurchaseContext] = useState({
    urgency: 'normal' as const,
    intendedWeddingCount: 1,
    weddingSeason: 'spring' as const,
    coordinatorExperience: 'experienced' as const,
    currentWeddingLoad: 3
  });
  
  const [purchaseIntent, setPurchaseIntent] = useState<any>(null);
  const [purchaseId, setPurchaseId] = useState<string>('');
  const [installationProgress, setInstallationProgress] = useState(0);
  const [paymentError, setPaymentError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('preview');
      setPurchaseIntent(null);
      setPaymentError('');
      setInstallationProgress(0);
    }
  }, [isOpen]);

  const createPurchaseIntent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketplace/purchase/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          purchaseContext
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create purchase intent');
      }

      const intent = await response.json();
      setPurchaseIntent(intent);
      setPurchaseId(intent.purchaseId);
      setCurrentStep('payment');
    } catch (error: any) {
      setPaymentError(error.message);
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!stripe || !elements || !purchaseIntent) return;

    setLoading(true);
    setPaymentError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        purchaseIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Wedding Coordinator', // Would get from user profile
            }
          }
        }
      );

      if (stripeError) {
        setPaymentError(stripeError.message || 'Payment failed');
        setCurrentStep('error');
        return;
      }

      if (confirmedIntent.status === 'succeeded') {
        // Confirm purchase with our backend
        const response = await fetch('/api/marketplace/purchase/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchaseId,
            paymentIntentId: confirmedIntent.id,
            installImmediately: true
          })
        });

        if (!response.ok) {
          throw new Error('Purchase confirmation failed');
        }

        const confirmation = await response.json();
        
        if (confirmation.installation?.status === 'in_progress') {
          setCurrentStep('installation');
          startInstallationPolling();
        } else {
          setCurrentStep('complete');
        }
      }
    } catch (error: any) {
      setPaymentError(error.message);
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const startInstallationPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/marketplace/purchase/${purchaseId}/status`);
        const status = await response.json();

        if (status.installation) {
          setInstallationProgress(status.installation.progress);

          if (status.installation.progress === 100 || status.purchase.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentStep('complete');
          }
        }
      } catch (error) {
        console.error('Failed to poll installation status:', error);
      }
    }, 2000);

    // Clear polling after 5 minutes max
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStepProgress = () => {
    const steps = ['preview', 'context', 'payment', 'processing', 'installation', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Purchase Template</span>
            <Badge variant="outline">{currentStep.replace('_', ' ')}</Badge>
          </DialogTitle>
          <Progress value={getStepProgress()} className="mt-2" />
        </DialogHeader>

        {/* Template Preview Step */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <img 
                src={template.thumbnailUrl} 
                alt={template.title}
                className="w-32 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{template.title}</h3>
                <p className="text-gray-600 mt-1">{template.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-2xl font-bold">{formatPrice(template.priceCents)}</span>
                  <Badge variant="outline">{template.estimatedSetupMinutes} min setup</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {template.demoUrl && (
                <Button variant="outline" asChild>
                  <a href={template.demoUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4 mr-2" />
                    View Demo
                  </a>
                </Button>
              )}
              <Button onClick={() => setCurrentStep('context')}>
                Continue Purchase
              </Button>
            </div>
          </div>
        )}

        {/* Purchase Context Step */}
        {currentStep === 'context' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Help us optimize your experience</h3>
              <p className="text-gray-600 mb-6">
                This information helps us provide better recommendations and support.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Purchase Urgency</label>
                <select 
                  value={purchaseContext.urgency}
                  onChange={(e) => setPurchaseContext(prev => ({ 
                    ...prev, 
                    urgency: e.target.value as any 
                  }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="normal">Normal - Planning ahead</option>
                  <option value="urgent">Urgent - Need soon</option>
                  <option value="emergency">Emergency - Need now!</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Experience</label>
                <select 
                  value={purchaseContext.coordinatorExperience}
                  onChange={(e) => setPurchaseContext(prev => ({ 
                    ...prev, 
                    coordinatorExperience: e.target.value as any 
                  }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="new">New to wedding coordination</option>
                  <option value="experienced">Experienced coordinator</option>
                  <option value="expert">Expert/Agency coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Intended Wedding Count</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50"
                  value={purchaseContext.intendedWeddingCount}
                  onChange={(e) => setPurchaseContext(prev => ({ 
                    ...prev, 
                    intendedWeddingCount: parseInt(e.target.value) 
                  }))}
                  className="w-full p-2 border rounded"
                  placeholder="How many weddings will use this?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Current Workload</label>
                <input 
                  type="number" 
                  min="0" 
                  max="20"
                  value={purchaseContext.currentWeddingLoad}
                  onChange={(e) => setPurchaseContext(prev => ({ 
                    ...prev, 
                    currentWeddingLoad: parseInt(e.target.value) 
                  }))}
                  className="w-full p-2 border rounded"
                  placeholder="Active weddings you're managing"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                Back
              </Button>
              <Button onClick={createPurchaseIntent} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {/* Payment Step */}
        {currentStep === 'payment' && purchaseIntent && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="text-2xl font-bold">
                    {formatPrice(purchaseIntent.amount.totalCents)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{template.title}</span>
                    <span>{formatPrice(purchaseIntent.amount.subtotalCents)}</span>
                  </div>
                  {purchaseIntent.amount.discountCents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(purchaseIntent.amount.discountCents)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatPrice(purchaseIntent.amount.totalCents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded">
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
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('context')}>
                Back
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!stripe || loading}
                className="flex-1"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Purchase {formatPrice(purchaseIntent.amount.totalCents)}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Secure payment powered by Stripe. Your payment information is encrypted and secure.
            </div>
          </div>
        )}

        {/* Installation Step */}
        {currentStep === 'installation' && (
          <div className="space-y-6 text-center">
            <div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
              <h3 className="text-xl font-semibold">Installing Template</h3>
              <p className="text-gray-600">
                Setting up your template components...
              </p>
            </div>

            <div className="w-full">
              <Progress value={installationProgress} className="h-3" />
              <div className="text-sm text-gray-500 mt-2">
                {installationProgress}% complete
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>Installing forms, journeys, and email templates...</p>
              <p>This usually takes 30-60 seconds.</p>
            </div>
          </div>
        )}

        {/* Success Step */}
        {currentStep === 'complete' && (
          <div className="space-y-6 text-center">
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Purchase Complete!</h3>
              <p className="text-gray-600">
                {template.title} has been installed and is ready to use.
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Template:</span>
                    <span className="font-medium">{template.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Purchase ID:</span>
                    <span className="font-mono text-xs">{purchaseId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Installation:</span>
                    <Badge variant="secondary">Complete</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button 
                onClick={() => {
                  onSuccess(purchaseId);
                  onClose();
                }}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Start Using Template
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  View Receipt
                </Button>
                <Button variant="outline" size="sm">
                  Rate Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Step */}
        {currentStep === 'error' && (
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {paymentError || 'An error occurred during the purchase process.'}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold">Common Solutions:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Check that your payment method has sufficient funds</li>
                <li>• Verify your billing information is correct</li>
                <li>• Try a different payment method</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('payment')}>
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PurchaseFlowModal;
```

## Integration Services

### Purchase Service Implementation
```typescript
// lib/services/purchase-service.ts
import { createClient } from '@/lib/supabase/client';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface PurchaseContext {
  urgency: 'normal' | 'urgent' | 'emergency';
  intendedWeddingCount?: number;
  weddingSeason?: string;
  coordinatorExperience?: string;
  currentWeddingLoad?: number;
}

class PurchaseService {
  private supabase = createClient();

  async createPurchaseIntent(templateId: string, userId: string, context: PurchaseContext) {
    // Get template details
    const { data: template } = await this.supabase
      .from('marketplace_templates')
      .select('*, creator:user_profiles(*)')
      .eq('id', templateId)
      .single();

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate user can purchase
    await this.validatePurchaseEligibility(userId, template);

    // Calculate pricing with any applicable discounts
    const pricing = await this.calculatePricing(template, userId, context);

    // Create Stripe PaymentIntent with application fee for marketplace commission
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.totalCents,
      currency: 'usd',
      application_fee_amount: pricing.platformCommissionCents,
      transfer_data: {
        destination: template.creator.stripe_account_id
      },
      metadata: {
        template_id: templateId,
        buyer_id: userId,
        purchase_context: JSON.stringify(context)
      },
      automatic_payment_methods: {
        enabled: true,
      }
    });

    // Create purchase record
    const { data: purchase } = await this.supabase
      .from('marketplace_purchases')
      .insert([{
        template_id: templateId,
        buyer_id: userId,
        amount_cents: pricing.totalCents,
        platform_commission_cents: pricing.platformCommissionCents,
        creator_payout_cents: pricing.creatorPayoutCents,
        payment_intent_id: paymentIntent.id,
        purchase_urgency: context.urgency,
        intended_wedding_count: context.intendedWeddingCount,
        wedding_season_context: context.weddingSeason,
        checkout_started_at: new Date().toISOString()
      }])
      .select()
      .single();

    return {
      purchaseId: purchase.id,
      clientSecret: paymentIntent.client_secret,
      amount: {
        subtotalCents: template.price_cents,
        discountCents: pricing.discountCents,
        totalCents: pricing.totalCents,
        currency: 'USD'
      },
      commission: {
        platformFeeCents: pricing.platformCommissionCents,
        creatorPayoutCents: pricing.creatorPayoutCents
      },
      template: {
        id: template.id,
        title: template.title,
        description: template.description,
        previewUrl: template.thumbnail_url,
        estimatedInstallTime: this.estimateInstallTime(template),
        componentCount: this.countComponents(template)
      },
      requirements: await this.checkPurchaseRequirements(userId, template)
    };
  }

  async confirmPurchase(purchaseId: string, paymentIntentId: string) {
    // Verify payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    // Update purchase record
    const { data: purchase } = await this.supabase
      .from('marketplace_purchases')
      .update({
        payment_status: 'succeeded',
        purchase_status: 'paid',
        payment_completed_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
      .select('*, template:marketplace_templates(*)')
      .single();

    // Start installation process
    try {
      await this.installTemplate(purchase);
      
      // Update analytics
      await this.updatePurchaseAnalytics(purchase);
      
      // Send confirmation notifications
      await this.sendPurchaseNotifications(purchase);

      return {
        purchaseId,
        status: 'installation_started',
        installation: {
          status: 'in_progress',
          progress: 0,
          estimatedTimeRemaining: this.estimateInstallTime(purchase.template)
        }
      };
    } catch (error) {
      console.error('Installation failed:', error);
      
      await this.supabase
        .from('marketplace_purchases')
        .update({
          purchase_status: 'failed',
          installation_errors: [error.message]
        })
        .eq('id', purchaseId);

      throw new Error('Installation failed. Please contact support.');
    }
  }

  private async validatePurchaseEligibility(userId: string, template: any) {
    // Check if user already owns this template
    const { data: existingPurchase } = await this.supabase
      .from('marketplace_purchases')
      .select('id')
      .eq('buyer_id', userId)
      .eq('template_id', template.id)
      .eq('purchase_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      throw new Error('You already own this template');
    }

    // Check subscription tier limits
    const { data: userProfile } = await this.supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (template.minimum_tier_required && userProfile.subscription_tier === 'starter') {
      const { count: monthlyPurchases } = await this.supabase
        .from('marketplace_purchases')
        .select('*', { count: 'exact' })
        .eq('buyer_id', userId)
        .eq('purchase_status', 'completed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (monthlyPurchases >= 3) { // Starter tier limit
        throw new Error('Monthly purchase limit reached. Please upgrade your subscription.');
      }
    }
  }

  private async calculatePricing(template: any, userId: string, context: PurchaseContext) {
    let subtotalCents = template.price_cents;
    let discountCents = 0;

    // Apply urgency pricing (premium for emergency)
    if (context.urgency === 'emergency') {
      subtotalCents = Math.round(subtotalCents * 1.2); // 20% emergency premium
    }

    // Apply bulk discount for high wedding counts
    if (context.intendedWeddingCount && context.intendedWeddingCount > 5) {
      discountCents = Math.round(subtotalCents * 0.1); // 10% bulk discount
    }

    // Apply new coordinator discount
    if (context.coordinatorExperience === 'new') {
      discountCents = Math.max(discountCents, Math.round(subtotalCents * 0.15)); // 15% new coordinator discount
    }

    const totalCents = subtotalCents - discountCents;
    const platformCommissionCents = Math.round(totalCents * 0.1); // 10% platform fee
    const creatorPayoutCents = totalCents - platformCommissionCents;

    return {
      subtotalCents,
      discountCents,
      totalCents,
      platformCommissionCents,
      creatorPayoutCents
    };
  }

  private async installTemplate(purchase: any) {
    const template = purchase.template;
    const componentsToInstall = JSON.parse(template.package_data || '{}');
    
    // Update status to installing
    await this.supabase
      .from('marketplace_purchases')
      .update({
        purchase_status: 'installing',
        installation_started_at: new Date().toISOString()
      })
      .eq('id', purchase.id);

    const installedComponents = {
      forms: 0,
      journeys: 0,
      emailTemplates: 0,
      documents: 0
    };

    // Install forms
    if (componentsToInstall.forms) {
      for (const formTemplate of componentsToInstall.forms) {
        await this.installForm(formTemplate, purchase.buyer_id);
        installedComponents.forms++;
      }
    }

    // Install journeys
    if (componentsToInstall.journeys) {
      for (const journeyTemplate of componentsToInstall.journeys) {
        await this.installJourney(journeyTemplate, purchase.buyer_id);
        installedComponents.journeys++;
      }
    }

    // Install email templates
    if (componentsToInstall.emails) {
      for (const emailTemplate of componentsToInstall.emails) {
        await this.installEmailTemplate(emailTemplate, purchase.buyer_id);
        installedComponents.emailTemplates++;
      }
    }

    // Mark as complete
    await this.supabase
      .from('marketplace_purchases')
      .update({
        purchase_status: 'completed',
        installed_successfully: true,
        installation_completed_at: new Date().toISOString(),
        installed_components: installedComponents
      })
      .eq('id', purchase.id);
  }

  private async installForm(formTemplate: any, userId: string) {
    // Create new form with sanitized template data
    const newForm = {
      ...formTemplate,
      id: crypto.randomUUID(), // Generate new ID
      user_id: userId,
      created_at: new Date().toISOString(),
      // Remove any template-specific metadata
      is_template: false,
      template_source_id: formTemplate.id
    };

    // Regenerate IDs for form fields to prevent conflicts
    if (newForm.fields) {
      newForm.fields = newForm.fields.map((field: any) => ({
        ...field,
        id: crypto.randomUUID()
      }));
    }

    const { error } = await this.supabase
      .from('forms')
      .insert([newForm]);

    if (error) {
      throw new Error(`Failed to install form: ${error.message}`);
    }
  }

  private async installJourney(journeyTemplate: any, userId: string) {
    // Similar to installForm but for journey templates
    const newJourney = {
      ...journeyTemplate,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      is_template: false,
      template_source_id: journeyTemplate.id
    };

    // Regenerate IDs for journey nodes and connections
    if (newJourney.nodes) {
      const idMapping = new Map();
      
      newJourney.nodes = newJourney.nodes.map((node: any) => {
        const newId = crypto.randomUUID();
        idMapping.set(node.id, newId);
        return { ...node, id: newId };
      });

      // Update connections with new node IDs
      if (newJourney.connections) {
        newJourney.connections = newJourney.connections.map((conn: any) => ({
          ...conn,
          source: idMapping.get(conn.source) || conn.source,
          target: idMapping.get(conn.target) || conn.target
        }));
      }
    }

    const { error } = await this.supabase
      .from('journeys')
      .insert([newJourney]);

    if (error) {
      throw new Error(`Failed to install journey: ${error.message}`);
    }
  }

  private async installEmailTemplate(emailTemplate: any, userId: string) {
    const newEmailTemplate = {
      ...emailTemplate,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      is_template: false,
      template_source_id: emailTemplate.id
    };

    const { error } = await this.supabase
      .from('email_templates')
      .insert([newEmailTemplate]);

    if (error) {
      throw new Error(`Failed to install email template: ${error.message}`);
    }
  }

  private estimateInstallTime(template: any): string {
    const componentCount = this.countComponents(template);
    const timeMinutes = Math.max(1, componentCount * 0.5); // 30 seconds per component minimum
    
    if (timeMinutes < 2) return '1-2 minutes';
    if (timeMinutes < 5) return '2-5 minutes';
    return `${Math.round(timeMinutes)} minutes`;
  }

  private countComponents(template: any): number {
    const packageData = JSON.parse(template.package_data || '{}');
    let count = 0;
    
    count += packageData.forms?.length || 0;
    count += packageData.journeys?.length || 0;
    count += packageData.emails?.length || 0;
    count += packageData.documents?.length || 0;
    
    return count;
  }

  private async checkPurchaseRequirements(userId: string, template: any) {
    const { data: userProfile } = await this.supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const { count: monthlyPurchases } = await this.supabase
      .from('marketplace_purchases')
      .select('*', { count: 'exact' })
      .eq('buyer_id', userId)
      .eq('purchase_status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return {
      tierAccess: this.checkTierAccess(userProfile.subscription_tier, template.minimum_tier_required),
      monthlyLimit: userProfile.subscription_tier === 'starter' ? {
        remaining: Math.max(0, 3 - monthlyPurchases),
        total: 3
      } : null,
      conflictsWithExisting: false // Would check for template conflicts
    };
  }

  private checkTierAccess(userTier: string, requiredTier: string): boolean {
    const tierLevels = { starter: 1, professional: 2, enterprise: 3 };
    return tierLevels[userTier] >= tierLevels[requiredTier];
  }

  private async updatePurchaseAnalytics(purchase: any) {
    // Track successful purchase in analytics
    await this.supabase
      .from('creator_analytics_events')
      .insert([{
        creator_id: purchase.template.creator_id,
        template_id: purchase.template_id,
        event_type: 'purchase',
        event_data: { revenue: purchase.creator_payout_cents },
        user_id: purchase.buyer_id,
        session_id: crypto.randomUUID() // Would track actual session
      }]);
  }

  private async sendPurchaseNotifications(purchase: any) {
    // Send confirmation email to buyer
    // Send sale notification to creator
    // These would integrate with the notification system
    console.log('Sending purchase notifications for:', purchase.id);
  }
}

export const purchaseService = new PurchaseService();
```

## PostgreSQL/Supabase MCP Integration

```sql
-- Function to handle post-purchase cleanup and analytics
CREATE OR REPLACE FUNCTION handle_successful_purchase() RETURNS TRIGGER AS $$
BEGIN
  -- Update template sales count
  UPDATE marketplace_templates 
  SET total_sales = total_sales + 1,
      last_purchased_at = NEW.payment_completed_at
  WHERE id = NEW.template_id;
  
  -- Update creator metrics
  INSERT INTO creator_daily_metrics (creator_id, metric_date, purchases, gross_revenue)
  SELECT 
    mt.creator_id,
    NEW.payment_completed_at::DATE,
    1,
    NEW.creator_payout_cents
  FROM marketplace_templates mt
  WHERE mt.id = NEW.template_id
  ON CONFLICT (creator_id, metric_date) 
  DO UPDATE SET
    purchases = creator_daily_metrics.purchases + 1,
    gross_revenue = creator_daily_metrics.gross_revenue + EXCLUDED.gross_revenue;

  -- Track successful funnel completion
  INSERT INTO purchase_funnel_events (
    session_id, user_id, template_id, event_type, 
    funnel_position, purchase_intent, time_on_step_seconds
  ) VALUES (
    gen_random_uuid(), -- Would use actual session tracking
    NEW.buyer_id,
    NEW.template_id,
    'purchase_completed',
    5, -- Final funnel position
    CASE NEW.purchase_urgency 
      WHEN 'emergency' THEN 'emergency'
      WHEN 'urgent' THEN 'specific_need'
      ELSE 'browsing'
    END,
    EXTRACT(EPOCH FROM (NEW.payment_completed_at - NEW.checkout_started_at))::INTEGER
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run analytics after successful purchases
CREATE TRIGGER purchase_success_analytics_trigger
    AFTER UPDATE ON marketplace_purchases
    FOR EACH ROW
    WHEN (OLD.purchase_status != 'completed' AND NEW.purchase_status = 'completed')
    EXECUTE FUNCTION handle_successful_purchase();

-- Function to analyze purchase abandonment (for recovery emails)
CREATE OR REPLACE FUNCTION get_abandoned_purchases(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  purchase_id UUID,
  buyer_id UUID,
  template_id UUID,
  template_title TEXT,
  amount_cents INTEGER,
  abandonment_stage TEXT,
  time_since_abandonment INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.buyer_id,
    mp.template_id,
    mt.title,
    mp.amount_cents,
    mp.purchase_status,
    NOW() - mp.updated_at
  FROM marketplace_purchases mp
  JOIN marketplace_templates mt ON mt.id = mp.template_id
  WHERE mp.purchase_status IN ('created', 'payment_pending')
    AND mp.created_at >= NOW() - INTERVAL '1 day' * days_back
    AND mp.updated_at < NOW() - INTERVAL '1 hour' -- Abandoned for at least 1 hour
  ORDER BY mp.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate purchase conversion rates by template
CREATE OR REPLACE FUNCTION get_template_conversion_rates()
RETURNS TABLE (
  template_id UUID,
  template_title TEXT,
  total_views BIGINT,
  checkout_starts BIGINT,
  completed_purchases BIGINT,
  view_to_checkout_rate DECIMAL,
  checkout_to_purchase_rate DECIMAL,
  overall_conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH template_funnel AS (
    SELECT 
      pfe.template_id,
      COUNT(*) FILTER (WHERE pfe.event_type = 'template_view') as views,
      COUNT(*) FILTER (WHERE pfe.event_type = 'checkout_started') as checkouts,
      COUNT(*) FILTER (WHERE pfe.event_type = 'purchase_completed') as purchases
    FROM purchase_funnel_events pfe
    WHERE pfe.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY pfe.template_id
  )
  SELECT 
    tf.template_id,
    mt.title,
    tf.views,
    tf.checkouts,
    tf.purchases,
    CASE WHEN tf.views > 0 THEN tf.checkouts::DECIMAL / tf.views * 100 ELSE 0 END,
    CASE WHEN tf.checkouts > 0 THEN tf.purchases::DECIMAL / tf.checkouts * 100 ELSE 0 END,
    CASE WHEN tf.views > 0 THEN tf.purchases::DECIMAL / tf.views * 100 ELSE 0 END
  FROM template_funnel tf
  JOIN marketplace_templates mt ON mt.id = tf.template_id
  WHERE tf.views >= 10 -- Only include templates with meaningful traffic
  ORDER BY tf.purchases DESC, tf.views DESC;
END;
$$ LANGUAGE plpgsql;

-- View for purchase analytics dashboard
CREATE OR REPLACE VIEW purchase_analytics_summary AS
SELECT 
  DATE_TRUNC('day', mp.created_at) as purchase_date,
  COUNT(*) as total_purchases,
  COUNT(*) FILTER (WHERE mp.purchase_status = 'completed') as successful_purchases,
  COUNT(*) FILTER (WHERE mp.purchase_status = 'failed') as failed_purchases,
  SUM(mp.amount_cents) FILTER (WHERE mp.purchase_status = 'completed') as total_revenue_cents,
  SUM(mp.platform_commission_cents) FILTER (WHERE mp.purchase_status = 'completed') as platform_revenue_cents,
  AVG(EXTRACT(EPOCH FROM (mp.payment_completed_at - mp.checkout_started_at))) as avg_purchase_time_seconds,
  COUNT(DISTINCT mp.buyer_id) as unique_buyers,
  mp.purchase_urgency,
  COUNT(*) FILTER (WHERE mp.device_type = 'mobile') as mobile_purchases
FROM marketplace_purchases mp
WHERE mp.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', mp.created_at), mp.purchase_urgency
ORDER BY purchase_date DESC;
```

## Testing Requirements

### Unit Tests
```typescript
// __tests__/purchase-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purchaseService } from '@/lib/services/purchase-service';

describe('PurchaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create purchase intent with correct pricing', async () => {
    const intent = await purchaseService.createPurchaseIntent(
      'template-1',
      'user-1',
      {
        urgency: 'normal',
        intendedWeddingCount: 1,
        coordinatorExperience: 'experienced'
      }
    );

    expect(intent).toHaveProperty('purchaseId');
    expect(intent).toHaveProperty('clientSecret');
    expect(intent.amount.totalCents).toBeGreaterThan(0);
    expect(intent.commission.platformFeeCents).toBeGreaterThan(0);
  });

  it('should apply emergency pricing premium', async () => {
    const normalIntent = await purchaseService.createPurchaseIntent(
      'template-1',
      'user-1',
      { urgency: 'normal' }
    );

    const emergencyIntent = await purchaseService.createPurchaseIntent(
      'template-1',
      'user-1',
      { urgency: 'emergency' }
    );

    expect(emergencyIntent.amount.totalCents).toBeGreaterThan(
      normalIntent.amount.totalCents
    );
  });

  it('should prevent duplicate purchases', async () => {
    await expect(
      purchaseService.createPurchaseIntent(
        'already-owned-template',
        'user-1',
        { urgency: 'normal' }
      )
    ).rejects.toThrow('already own this template');
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/purchase-flow.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Purchase Flow Integration', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  it('should complete full purchase and installation flow', async () => {
    // Create test template
    const { data: template } = await supabase
      .from('marketplace_templates')
      .insert([{
        title: 'Test Template',
        description: 'Test purchase flow',
        price_cents: 5000,
        package_data: JSON.stringify({
          forms: [{ id: 'form-1', title: 'Test Form', fields: [] }]
        })
      }])
      .select()
      .single();

    // Create purchase intent
    const intentResponse = await fetch('/api/marketplace/purchase/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        purchaseContext: { urgency: 'normal' }
      })
    });

    const intent = await intentResponse.json();
    expect(intent.purchaseId).toBeDefined();

    // Simulate successful payment confirmation
    const confirmResponse = await fetch('/api/marketplace/purchase/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purchaseId: intent.purchaseId,
        paymentIntentId: 'test-payment-intent'
      })
    });

    const confirmation = await confirmResponse.json();
    expect(confirmation.status).toBe('installation_started');

    // Verify purchase was created
    const { data: purchase } = await supabase
      .from('marketplace_purchases')
      .select('*')
      .eq('id', intent.purchaseId)
      .single();

    expect(purchase.purchase_status).toBe('installing');
    expect(purchase.payment_completed_at).toBeDefined();
  });
});
```

## Acceptance Criteria

### ✅ Complete Purchase Flow
- [ ] Users can purchase templates through intuitive multi-step flow
- [ ] Payment processing integrates securely with Stripe
- [ ] Purchase context collection optimizes pricing and support
- [ ] Mobile purchase flow works seamlessly with touch interfaces
- [ ] Purchase confirmation provides clear next steps

### ✅ Secure Payment Processing
- [ ] Stripe integration handles all payment methods (card, Apple Pay, Google Pay)
- [ ] Marketplace commission split configured correctly
- [ ] Payment failures provide clear error messages and recovery options
- [ ] PCI compliance maintained through Stripe tokenization
- [ ] Webhook validation ensures purchase integrity

### ✅ Automated Template Installation
- [ ] Template components install automatically after payment
- [ ] Installation progress displayed in real-time
- [ ] Failed installations trigger support workflows
- [ ] Component ID conflicts prevented through UUID regeneration
- [ ] Installation rollback on partial failures

### ✅ Business Rules & Validation
- [ ] Subscription tier limits enforced before purchase
- [ ] Duplicate purchase prevention for same template
- [ ] Emergency purchase pricing premium applied correctly
- [ ] Bulk purchase discounts calculated accurately
- [ ] Rate limiting prevents purchase spam

### ✅ Analytics & Intelligence
- [ ] Purchase funnel events tracked at each step
- [ ] Abandonment analysis identifies recovery opportunities
- [ ] Conversion rate optimization data collected
- [ ] Purchase context influences future recommendations
- [ ] Revenue analytics enable business insights

**MCP Integration Requirements:**
- [ ] PostgreSQL MCP handles complex purchase analytics queries
- [ ] Post-purchase triggers update template and creator metrics
- [ ] Abandoned purchase analysis via database functions
- [ ] Purchase conversion rate calculations optimized for speed
- [ ] Revenue analytics views accessible for business intelligence

---

**Estimated Development Time:** 3-4 weeks  
**Team Requirement:** Integration team with payments and e-commerce experience  
**External Dependencies:** Stripe Connect, webhook infrastructure, email service  
**Success Metrics:** Purchase conversion rate, installation success rate, payment failure rate, time-to-purchase