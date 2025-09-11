/**
 * Unit tests for billing tiers API endpoint
 * WS-131 Pricing Strategy System - Team D Round 1
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { GET } from '@/app/api/billing/tiers/route';
import { createMocks } from 'node-mocks-http';
// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockSubscriptionPlans,
            error: null
          }))
        }))
      }))
    }))
  }))
}));
const mockSubscriptionPlans = [
  {
    id: '1',
    name: 'starter',
    display_name: 'Starter',
    description: 'Perfect for intimate weddings',
    tier: 'starter',
    price: 0,
    yearly_price: 0,
    currency: 'USD',
    billing_interval: 'month',
    trial_days: 0,
    tagline: 'Perfect for intimate weddings',
    is_popular: false,
    is_featured: false,
    badge_text: null,
    badge_variant: null,
    limits: {
      guests: 100,
      events: 1,
      storage_gb: 1,
      team_members: 2,
      templates: 3
    },
    features: [
      'Guest list management',
      'RSVP tracking',
      'Basic invitation templates'
    ],
    sort_order: 1,
    stripe_price_id: 'price_starter_free',
    yearly_stripe_price_id: 'price_starter_free_yearly'
  },
    id: '2',
    name: 'professional',
    display_name: 'Professional',
    description: 'Most popular for medium weddings',
    tier: 'professional',
    price: 29.00,
    yearly_price: 290.00,
    trial_days: 14,
    tagline: 'Most popular for medium weddings',
    is_popular: true,
    badge_text: 'Most Popular',
    badge_variant: 'success',
      guests: 300,
      events: 3,
      storage_gb: 10,
      team_members: 5,
      templates: 25
      'Advanced guest management',
      'RSVP tracking & reminders',
      'Premium templates'
    sort_order: 2,
    stripe_price_id: 'price_professional_monthly',
    yearly_stripe_price_id: 'price_professional_yearly'
  }
];
describe('/api/billing/tiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('GET /api/billing/tiers', () => {
    it('should return pricing tiers with monthly billing by default', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/billing/tiers'
      });
      const request = req as unknown as NextRequest;
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.billing_cycle).toBe('monthly');
      expect(data.data.plans).toHaveLength(2);
      expect(data.data.total_plans).toBe(2);
    });
    it('should return pricing tiers with yearly billing when requested', async () => {
        url: '/api/billing/tiers?cycle=yearly'
      expect(data.data.billing_cycle).toBe('yearly');
      
      // Check that yearly savings are calculated
      const professionalPlan = data.data.plans.find((plan: any) => plan.tier === 'professional');
      expect(professionalPlan.savings).toBeDefined();
      expect(professionalPlan.savings.percentage).toBe(17); // (29*12-290)/(29*12) * 100
    it('should transform database plans to frontend format correctly', async () => {
      const starterPlan = data.data.plans.find((plan: any) => plan.tier === 'starter');
      expect(starterPlan).toMatchObject({
        id: 'starter',
        tier: 'starter',
        name: 'Starter',
        tagline: 'Perfect for intimate weddings',
        price: {
          monthly: 0,
          yearly: 0,
          currency: 'USD'
        },
        featured: false,
        popular: false,
        limits: {
          guests: 100,
          events: 1,
          storage_gb: 1,
          team_members: 2,
          templates: 3
        features: expect.arrayContaining([
          expect.objectContaining({
            name: 'Guest list management',
            included: true
          })
        ]),
        cta: {
          primary: 'Start Free',
          secondary: 'No credit card required'
        }
    it('should include badge information for popular plans', async () => {
      expect(professionalPlan.badge).toEqual({
        text: 'Most Popular',
        variant: 'success'
    it('should return 400 for invalid billing cycle', async () => {
        url: '/api/billing/tiers?cycle=invalid'
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid billing cycle');
    it('should set correct CTAs based on plan type', async () => {
      expect(starterPlan.cta.primary).toBe('Start Free');
      expect(starterPlan.cta.secondary).toBe('No credit card required');
      expect(professionalPlan.cta.primary).toBe('Start 14-day trial');
      expect(professionalPlan.cta.secondary).toBe('Cancel anytime');
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { createClient } = require('@supabase/supabase-js');
      createClient.mockImplementation(() => ({
        from: () => ({
          select: () => ({
            order: () => ({
              eq: () => ({
                data: null,
                error: { message: 'Database connection failed' }
              })
            })
        })
      }));
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch subscription plans');
    it('should include trial information in response', async () => {
      expect(data.data.has_trial).toBe(true);
      expect(professionalPlan.trial_days).toBe(14);
  describe('Plan transformation helpers', () => {
    it('should calculate yearly savings correctly', () => {
      const monthlyPrice = 29;
      const yearlyPrice = 290;
      const expectedSavings = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
      expect(expectedSavings).toBe(17); // ~17% savings
    it('should not calculate savings for free plans', () => {
      const monthlyPrice = 0;
      const yearlyPrice = 0;
      const savings = monthlyPrice > 0 ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) : 0;
      expect(savings).toBe(0);
});
