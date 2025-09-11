/**
 * Payment and Billing Components for WedSync 2.0
 *
 * Complete payment UI implementation with Stripe Elements integration
 * Includes PCI DSS compliant payment processing and subscription management
 *
 * Round 2 Implementation - Team A
 */

export { PaymentForm } from './PaymentForm';
export { SubscriptionCard } from './SubscriptionCard';
export { PricingPlans } from './PricingPlans';
export { PaymentHistory } from './PaymentHistory';
export { PaymentMethods } from './PaymentMethods';

// Type exports for external usage
export type {
  SubscriptionTier,
  TierDefinition,
  TierFeatures,
} from '@/lib/stripe-config';

// Common interfaces used across billing components
export interface PaymentFormData {
  name: string;
  email: string;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  billingCycle: 'monthly' | 'annual';
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  downloadUrl?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentMethod {
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

// Import this from @/lib/stripe-config for tier definitions
import { SubscriptionTier } from '@/lib/stripe-config';
