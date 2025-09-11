/**
 * Integration Tests for Stripe Webhook Processing
 * Tests webhook event handling and subscription management
 */

import { POST } from '@/app/api/stripe/webhook/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto';

// Mock Stripe
jest.mock('stripe');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}));

// Mock audit logger
jest.mock('@/lib/security-audit-logger', () => ({
  auditWebhook: {
    received: jest.fn(),
    processed: jest.fn(),
    failed: jest.fn(),
    invalidSignature: jest.fn()
  }
}));

describe('Stripe Webhook Processing', () => {
  let mockStripe: any;
  let mockSupabase: any;
  const webhookSecret = 'whsec_test_secret_123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

    // Setup Stripe mock
    mockStripe = {
      webhooks: {
        constructEvent: jest.fn()
      },
      subscriptions: {
        retrieve: jest.fn()
      },
      customers: {
        retrieve: jest.fn()
      },
      invoices: {
        retrieve: jest.fn()
      }
    };
    
    (Stripe as any).mockImplementation(() => mockStripe);

    // Setup Supabase mock
    const { createClient } = require('@supabase/supabase-js');
    mockSupabase = createClient();
  });

  const createWebhookRequest = (event: any, signature?: string) => {
    const payload = JSON.stringify(event);
    const computedSignature = signature || generateWebhookSignature(payload, webhookSecret);
    
    return new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': computedSignature,
        'content-type': 'application/json'
      },
      body: payload
    });
  };

  const generateWebhookSignature = (payload: string, secret: string) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  };

  describe('Webhook Signature Validation', () => {
    it('should reject webhooks with missing signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toContain('No signature');
    });

    it('should reject webhooks with invalid signature', async () => {
      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      };

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      const request = createWebhookRequest(event, 'invalid_signature');
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid signature');
    });

    it('should accept webhooks with valid signature', async () => {
      const event = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              organization_id: 'org_123',
              tier: 'PROFESSIONAL'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe('Subscription Events', () => {
    const tiers = [
      { name: 'STARTER', price: 19 },
      { name: 'PROFESSIONAL', price: 49 },
      { name: 'SCALE', price: 79 },
      { name: 'ENTERPRISE', price: 149 }
    ];

    tiers.forEach(({ name, price }) => {
      describe(`${name} Tier (£${price}/month)`, () => {
        it(`should handle checkout.session.completed for ${name} tier`, async () => {
          const event = {
            id: 'evt_test_checkout',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                customer: 'cus_test_123',
                subscription: 'sub_test_123',
                payment_status: 'paid',
                metadata: {
                  organization_id: 'org_123',
                  user_id: 'user_123',
                  tier: name,
                  billingCycle: 'monthly'
                }
              }
            }
          };

          mockStripe.webhooks.constructEvent.mockReturnValue(event);
          
          // Mock subscription retrieval
          mockStripe.subscriptions.retrieve.mockResolvedValue({
            id: 'sub_test_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: {
              data: [{
                price: {
                  id: `price_${name.toLowerCase()}_monthly`,
                  unit_amount: price * 100, // Stripe uses pence
                  currency: 'gbp'
                }
              }]
            }
          });

          // Mock database updates
          mockSupabase.from().upsert().select().single.mockResolvedValue({
            data: { id: 1 },
            error: null
          });

          mockSupabase.from().update().eq().select().single.mockResolvedValue({
            data: {
              id: 'org_123',
              subscription_tier: name,
              subscription_status: 'active'
            },
            error: null
          });

          const request = createWebhookRequest(event);
          const response = await POST(request);
          
          expect(response.status).toBe(200);
          
          // Verify organization was updated with correct tier
          expect(mockSupabase.from().update).toHaveBeenCalledWith(
            expect.objectContaining({
              subscription_tier: name,
              subscription_status: 'active',
              stripe_subscription_id: 'sub_test_123'
            })
          );
        });

        it(`should handle subscription upgrade to ${name} tier`, async () => {
          const event = {
            id: 'evt_test_updated',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_test_123',
                customer: 'cus_test_123',
                status: 'active',
                metadata: {
                  organization_id: 'org_123',
                  tier: name
                },
                items: {
                  data: [{
                    price: {
                      id: `price_${name.toLowerCase()}_monthly`,
                      unit_amount: price * 100
                    }
                  }]
                }
              },
              previous_attributes: {
                items: {
                  data: [{
                    price: {
                      id: 'price_starter_monthly',
                      unit_amount: 1900
                    }
                  }]
                }
              }
            }
          };

          mockStripe.webhooks.constructEvent.mockReturnValue(event);
          
          mockSupabase.from().select().eq().single.mockResolvedValue({
            data: {
              id: 'org_123',
              stripe_customer_id: 'cus_test_123',
              subscription_tier: 'STARTER'
            },
            error: null
          });

          mockSupabase.from().update().eq().select().single.mockResolvedValue({
            data: {
              id: 'org_123',
              subscription_tier: name
            },
            error: null
          });

          mockSupabase.from().insert().select().single.mockResolvedValue({
            data: { id: 1 },
            error: null
          });

          const request = createWebhookRequest(event);
          const response = await POST(request);
          
          expect(response.status).toBe(200);
          
          // Verify tier upgrade was logged
          expect(mockSupabase.from().insert).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: 'subscription.tier_changed',
              old_tier: 'STARTER',
              new_tier: name
            })
          );
        });
      });
    });

    it('should handle subscription cancellation', async () => {
      const event = {
        id: 'evt_test_canceled',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
            metadata: {
              organization_id: 'org_123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'org_123',
          stripe_customer_id: 'cus_test_123',
          subscription_tier: 'PROFESSIONAL'
        },
        error: null
      });

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'org_123',
          subscription_tier: 'FREE',
          subscription_status: 'canceled'
        },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify organization was downgraded to FREE tier
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: 'FREE',
          subscription_status: 'canceled',
          stripe_subscription_id: null
        })
      );
    });

    it('should handle trial ending', async () => {
      const event = {
        id: 'evt_test_trial_end',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60, // 3 days
            metadata: {
              organization_id: 'org_123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      // Mock email notification (would be implemented)
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify trial ending notification was created
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trial_ending',
          organization_id: 'org_123'
        })
      );
    });
  });

  describe('Payment Events', () => {
    it('should handle successful payment', async () => {
      const event = {
        id: 'evt_test_payment',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_paid: 4900, // £49.00
            currency: 'gbp',
            metadata: {
              organization_id: 'org_123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify payment was recorded
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_invoice_id: 'in_test_123',
          amount: 4900,
          currency: 'gbp',
          status: 'succeeded'
        })
      );
    });

    it('should handle failed payment', async () => {
      const event = {
        id: 'evt_test_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_due: 7900, // £79.00
            currency: 'gbp',
            metadata: {
              organization_id: 'org_123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      // Mock payment failure recording
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      // Mock organization update
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'org_123',
          payment_status: 'failed'
        },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify payment failure was recorded
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_invoice_id: 'in_test_123',
          amount: 7900,
          status: 'failed'
        })
      );

      // Verify organization payment status was updated
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'failed'
        })
      );
    });
  });

  describe('Idempotency Handling', () => {
    it('should handle duplicate webhook events', async () => {
      const event = {
        id: 'evt_duplicate_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              organization_id: 'org_123',
              tier: 'PROFESSIONAL'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      // First call - event is new
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null, // Event not found
        error: null
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 1 },
        error: null
      });

      const request1 = createWebhookRequest(event);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second call - event already processed
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 1, event_id: 'evt_duplicate_123' }, // Event found
        error: null
      });

      const request2 = createWebhookRequest(event);
      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      // Verify event was only processed once
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const event = {
        id: 'evt_test_db_error',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              organization_id: 'org_123',
              tier: 'SCALE'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      // Simulate database error
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to process webhook');
    });

    it('should handle unknown event types', async () => {
      const event = {
        id: 'evt_test_unknown',
        type: 'unknown.event.type',
        data: {
          object: {
            id: 'obj_test_123'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(data.message).toContain('Unhandled event type');
    });
  });

  describe('Refund Processing', () => {
    it('should handle charge refunded event', async () => {
      const event = {
        id: 'evt_test_refund',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_123',
            customer: 'cus_test_123',
            amount: 4900,
            amount_refunded: 4900,
            currency: 'gbp',
            metadata: {
              organization_id: 'org_123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      const request = createWebhookRequest(event);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      // Verify refund was recorded
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_charge_id: 'ch_test_123',
          amount_refunded: 4900,
          refund_status: 'completed'
        })
      );
    });
  });
});