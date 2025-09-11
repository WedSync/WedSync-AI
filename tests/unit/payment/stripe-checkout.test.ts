/**
 * Unit Tests for Stripe Checkout Session Creation
 * Tests all pricing tiers and payment scenarios
 */

import { POST } from '@/app/api/stripe/create-checkout-session/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}));

// Mock security modules
jest.mock('@/lib/api-middleware', () => ({
  withRateLimit: jest.fn((req, opts, handler) => handler())
}));

jest.mock('@/lib/crypto-utils', () => ({
  generateSecureToken: jest.fn(() => 'test-token-123'),
  hashData: jest.fn((data) => `hashed-${data}`)
}));

jest.mock('@/lib/security-audit-logger', () => ({
  auditPayment: {
    checkoutAttempt: jest.fn(),
    checkoutSuccess: jest.fn(),
    checkoutFailure: jest.fn()
  }
}));

describe('Stripe Checkout Session API', () => {
  let mockStripe: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Stripe mock
    mockStripe = {
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
      },
      prices: {
        retrieve: jest.fn().mockResolvedValue({ id: 'price_test123' })
      },
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
          })
        }
      }
    };
    
    (Stripe as any).mockImplementation(() => mockStripe);

    // Setup Supabase mock
    const { createClient } = require('@supabase/supabase-js');
    mockSupabase = createClient();
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without auth token', async () => {
      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ tier: 'STARTER', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject requests with invalid auth token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Invalid token') 
      });

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer invalid-token' },
        body: JSON.stringify({ tier: 'STARTER', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should reject non-admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { organization_id: 'org123', role: 'MEMBER' }, // Non-admin role
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'PROFESSIONAL', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Insufficient permissions');
    });
  });

  describe('Pricing Tier Validation', () => {
    const setupValidUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ // User profile
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        })
        .mockResolvedValueOnce({ // Organization
          data: {
            id: 'org123',
            name: 'Test Org',
            billing_email: 'billing@test.com',
            stripe_customer_id: null,
            subscription_status: 'trialing'
          },
          error: null
        });
    };

    const testTiers = [
      { tier: 'STARTER', price: 19, expectedMapping: 'STARTER' },
      { tier: 'PROFESSIONAL', price: 49, expectedMapping: 'PROFESSIONAL' },
      { tier: 'SCALE', price: 79, expectedMapping: 'SCALE' },
      { tier: 'ENTERPRISE', price: 149, expectedMapping: 'ENTERPRISE' }
    ];

    testTiers.forEach(({ tier, price, expectedMapping }) => {
      it(`should create checkout session for ${tier} tier (£${price}/month)`, async () => {
        setupValidUser();
        
        // Set up environment variables for this tier
        process.env[`STRIPE_${tier}_MONTHLY_PRICE_ID`] = `price_${tier.toLowerCase()}_monthly`;
        
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'authorization': 'Bearer valid-token' },
          body: JSON.stringify({ tier, billingCycle: 'monthly' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.url).toContain('checkout.stripe.com');
        expect(data.sessionId).toBe('cs_test_123');

        // Verify Stripe was called with correct parameters
        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'subscription',
            subscription_data: expect.objectContaining({
              trial_period_days: 14,
              metadata: expect.objectContaining({
                tier: expectedMapping
              })
            })
          }),
          expect.any(Object)
        );
      });

      it(`should create yearly checkout session for ${tier} tier`, async () => {
        setupValidUser();
        
        process.env[`STRIPE_${tier}_YEARLY_PRICE_ID`] = `price_${tier.toLowerCase()}_yearly`;
        
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'authorization': 'Bearer valid-token' },
          body: JSON.stringify({ tier, billingCycle: 'yearly' })
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });
    });

    it('should reject FREE tier checkout', async () => {
      setupValidUser();

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'FREE', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Free tier does not require payment');
    });

    it('should reject invalid tier names', async () => {
      setupValidUser();

      const invalidTiers = ['BASIC', 'PREMIUM', 'INVALID', 'TEST'];

      for (const tier of invalidTiers) {
        const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'authorization': 'Bearer valid-token' },
          body: JSON.stringify({ tier, billingCycle: 'monthly' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid subscription tier');
      }
    });
  });

  describe('Customer Management', () => {
    const setupValidUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        });
    };

    it('should create new Stripe customer if not exists', async () => {
      setupValidUser();
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'org123',
          name: 'Test Organization',
          billing_email: 'billing@test.com',
          stripe_customer_id: null, // No existing customer
          subscription_status: 'trialing'
        },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'PROFESSIONAL', billingCycle: 'monthly' })
      });

      process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = 'price_pro_monthly';

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify customer creation
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'billing@test.com',
        name: 'Test Organization',
        metadata: {
          organization_id: 'org123',
          user_id: 'user123'
        }
      });

      // Verify customer ID was saved
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('should use existing Stripe customer if exists', async () => {
      setupValidUser();
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'org123',
          name: 'Test Organization',
          billing_email: 'billing@test.com',
          stripe_customer_id: 'cus_existing123', // Existing customer
          subscription_status: 'trialing'
        },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'SCALE', billingCycle: 'monthly' })
      });

      process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID = 'price_scale_monthly';

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify no new customer was created
      expect(mockStripe.customers.create).not.toHaveBeenCalled();

      // Verify existing customer was used
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Security Features', () => {
    const setupValidUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'org123',
            name: 'Test Org',
            billing_email: 'billing@test.com',
            stripe_customer_id: null,
            subscription_status: 'trialing'
          },
          error: null
        });
    };

    it('should sanitize input to prevent injection attacks', async () => {
      setupValidUser();
      
      const maliciousInput = {
        tier: 'PROFESSIONAL<script>alert("xss")</script>',
        billingCycle: 'monthly; DROP TABLE users;--'
      };

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify(maliciousInput)
      });

      process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = 'price_pro_monthly';

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify sanitized values were used
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            tier: 'professional', // Sanitized
            billingCycle: 'monthly' // Sanitized
          })
        }),
        expect.any(Object)
      );
    });

    it('should reject oversized payloads', async () => {
      setupValidUser();
      
      // Create a payload larger than 2KB
      const largePayload = {
        tier: 'PROFESSIONAL',
        billingCycle: 'monthly',
        padding: 'x'.repeat(3000) // Make payload > 2KB
      };

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify(largePayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toContain('payload too large');
    });

    it('should include security headers in response', async () => {
      setupValidUser();
      
      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = 'price_starter_monthly';

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'STARTER', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('should use idempotency keys to prevent duplicate charges', async () => {
      setupValidUser();
      
      process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = 'price_pro_monthly';

      const idempotencyKey = 'test-idempotency-key-123';

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ 
          tier: 'PROFESSIONAL', 
          billingCycle: 'monthly',
          idempotencyKey 
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify idempotency key was used
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          idempotencyKey: expect.stringContaining(idempotencyKey)
        })
      );
    });
  });

  describe('Error Handling', () => {
    const setupValidUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'org123',
            name: 'Test Org',
            billing_email: 'billing@test.com',
            stripe_customer_id: null,
            subscription_status: 'trialing'
          },
          error: null
        });
    };

    it('should handle Stripe API errors gracefully', async () => {
      setupValidUser();
      
      process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = 'price_enterprise_monthly';

      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error: Payment method required')
      );

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'ENTERPRISE', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create checkout session');
      // Should not expose internal error details
      expect(data.error).not.toContain('Stripe API error');
    });

    it('should handle invalid JSON payloads', async () => {
      setupValidUser();

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: 'invalid json {{'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON payload');
    });

    it('should reject organizations with active subscriptions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'org123',
            name: 'Test Org',
            billing_email: 'billing@test.com',
            stripe_customer_id: 'cus_123',
            subscription_status: 'active' // Already has active subscription
          },
          error: null
        });

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'SCALE', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already has an active subscription');
    });
  });

  describe('Trial Period Configuration', () => {
    const setupValidUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { organization_id: 'org123', role: 'OWNER' },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'org123',
            name: 'Test Org',
            billing_email: 'billing@test.com',
            stripe_customer_id: null,
            subscription_status: 'trialing'
          },
          error: null
        });
    };

    it('should include 14-day trial period for new subscriptions', async () => {
      setupValidUser();
      
      process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = 'price_pro_monthly';

      const request = new NextRequest('http://localhost:3000/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({ tier: 'PROFESSIONAL', billingCycle: 'monthly' })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify trial period is set
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14
          })
        }),
        expect.any(Object)
      );
    });
  });
});