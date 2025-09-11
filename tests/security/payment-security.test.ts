import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Payment Security Tests', () => {
  describe('Authentication', () => {
    it('should reject payment endpoint access without authentication', async () => {
      const response = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .send({ tier: 'pro', billingCycle: 'monthly' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', 'Bearer invalid-token-123')
        .send({ tier: 'pro', billingCycle: 'monthly' });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhooks without signature', async () => {
      const response = await request(API_URL)
        .post('/api/stripe/webhook')
        .send({ type: 'payment_intent.succeeded' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('stripe-signature');
    });

    it('should reject webhooks with invalid signature', async () => {
      const response = await request(API_URL)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'payment_intent.succeeded' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on payment endpoints', async () => {
      const token = 'test-auth-token'; // Replace with valid test token
      
      // Make 6 requests (limit is 5 per minute)
      const requests = Array(6).fill(null).map(() =>
        request(API_URL)
          .post('/api/stripe/create-checkout-session')
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: 'pro', billingCycle: 'monthly' })
      );
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid tier values', async () => {
      const token = 'test-auth-token';
      
      const response = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: '<script>alert("xss")</script>', billingCycle: 'monthly' });
      
      expect(response.status).toBe(400);
    });

    it('should reject oversized payloads', async () => {
      const token = 'test-auth-token';
      const largePayload = { tier: 'pro', data: 'x'.repeat(3000) };
      
      const response = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send(largePayload);
      
      expect(response.status).toBe(413);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate payment requests safely', async () => {
      const token = 'test-auth-token';
      const idempotencyKey = 'test-key-' + Date.now();
      
      const request1 = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'pro', billingCycle: 'monthly', idempotencyKey });
      
      const request2 = await request(API_URL)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'pro', billingCycle: 'monthly', idempotencyKey });
      
      // Should return same session ID for same idempotency key
      expect(request1.body.sessionId).toBe(request2.body.sessionId);
    });
  });
});