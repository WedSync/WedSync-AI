/**
 * WS-170 Viral Optimization System - Reward Engine Unit Tests
 * Comprehensive test coverage for viral reward calculations and distributions
 */

import { ViralRewardEngine } from '../reward-engine'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@/lib/supabase/server'
// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))
// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9)
  }
})
describe('ViralRewardEngine', () => {
  let mockSupabaseClient: any
  beforeEach(() => {
    mockSupabaseClient = {
      rpc: jest.fn(),
      from: jest.fn(() => ({
        insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: {} })) })) })),
        select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: {} })) })) }))
      }))
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })
  afterEach(() => {
    jest.clearAllMocks()
  describe('calculateViralReward', () => {
    beforeEach(() => {
      // Mock viral metrics
      mockSupabaseClient.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'execute_query' || fnName === 'execute_analytics_query') {
          return Promise.resolve({
            data: [{
              viral_coefficient: 2.5,
              network_depth: 3,
              total_referrals: 15,
              successful_conversions: 12,
              quality_score: 0.85
            }]
          })
        }
        return Promise.resolve({ data: [] })
      })
    })
    it('should calculate viral rewards with double-sided incentives', async () => {
      const result = await ViralRewardEngine.calculateViralReward(
        'referrer-id',
        'referee-id',
        'subscription',
        100
      )
      expect(result).toHaveProperty('referrer_reward')
      expect(result).toHaveProperty('referee_reward')
      expect(result).toHaveProperty('viral_multiplier')
      expect(result).toHaveProperty('total_system_cost')
      expect(result.referrer_reward.final_amount).toBeGreaterThan(0)
      expect(result.referee_reward.final_amount).toBeGreaterThan(0)
    it('should complete calculations within 100ms performance threshold', async () => {
      const startTime = Date.now()
      await ViralRewardEngine.calculateViralReward(
        'signup',
        50
      const executionTime = Date.now() - startTime
      expect(executionTime).toBeLessThan(100)
    it('should handle different referral types correctly', async () => {
      const signupResult = await ViralRewardEngine.calculateViralReward(
        'signup'
      const subscriptionResult = await ViralRewardEngine.calculateViralReward(
        200
      expect(subscriptionResult.referrer_reward.final_amount)
        .toBeGreaterThan(signupResult.referrer_reward.final_amount)
    it('should apply viral multipliers correctly', async () => {
      expect(result.viral_multiplier).toBeGreaterThan(1.0)
      expect(result.viral_multiplier).toBeLessThanOrEqual(2.5)
    it('should calculate network effect bonuses', async () => {
        500
      expect(result.network_effect_bonus).toBeGreaterThanOrEqual(0)
      expect(result.total_system_cost).toBe(
        result.referrer_reward.final_amount + 
        result.referee_reward.final_amount + 
        result.network_effect_bonus
    it('should handle revenue share calculations', async () => {
        'revenue_share',
        1000
      expect(result.referrer_reward.calculation_factors).toContain(
        expect.stringContaining('Revenue share')
    it('should determine appropriate distribution methods', async () => {
      const lowValueResult = await ViralRewardEngine.calculateViralReward(
      const highValueResult = await ViralRewardEngine.calculateViralReward(
        2000
      expect(['immediate', 'milestone_based', 'staggered'])
        .toContain(lowValueResult.distribution_method)
        .toContain(highValueResult.distribution_method)
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Database connection failed'))
      await expect(ViralRewardEngine.calculateViralReward(
      )).rejects.toThrow('Failed to calculate viral reward')
    it('should validate input parameters', async () => {
        '',
      )).rejects.toThrow()
  describe('processDoubleIncentive', () => {
    const mockDoubleIncentive = {
      referrer_reward: {
        final_amount: 50,
        currency: 'USD' as const,
        expires_at: new Date(Date.now() + 86400000)
      },
      referee_reward: {
        final_amount: 25,
      total_system_cost: 75,
      viral_multiplier: 1.5,
      network_effect_bonus: 5,
      combined_eligibility_score: 0.9,
      distribution_method: 'immediate' as const
    }
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ id: 'reward-record-id' }]
    it('should process double-sided distributions within 500ms', async () => {
      await ViralRewardEngine.processDoubleIncentive(
        mockDoubleIncentive
      expect(executionTime).toBeLessThan(500)
    it('should create reward records for both parties', async () => {
      const result = await ViralRewardEngine.processDoubleIncentive(
      expect(result.referrer_distribution).toBeDefined()
      expect(result.referee_distribution).toBeDefined()
      expect(result.total_distributed).toBe(mockDoubleIncentive.total_system_cost)
    it('should handle immediate distribution method', async () => {
        { ...mockDoubleIncentive, distribution_method: 'immediate' }
      expect(result.referrer_distribution.status).toBe('completed')
      expect(result.referee_distribution.status).toBe('completed')
    it('should handle milestone-based distribution method', async () => {
        { ...mockDoubleIncentive, distribution_method: 'milestone_based' }
      expect(result.referrer_distribution.method).toBe('milestone_based')
      expect(result.referee_distribution.method).toBe('milestone_based')
    it('should track processing time', async () => {
      expect(result.processing_time_ms).toBeGreaterThan(0)
      expect(result.processing_time_ms).toBeLessThan(500)
    it('should handle database failures', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Database error'))
      await expect(ViralRewardEngine.processDoubleIncentive(
      )).rejects.toThrow('Failed to process double incentive distribution')
  describe('calculateViralCoefficient', () => {
    it('should calculate viral coefficient correctly', async () => {
        data: [{
          direct_referrals: 10,
          indirect_referrals: 25,
          viral_coefficient: 2.5
        }]
      const coefficient = await ViralRewardEngine.calculateViralCoefficient('user-id')
      
      expect(coefficient).toBe(2.5)
    it('should cap viral coefficient at maximum', async () => {
          direct_referrals: 5,
          indirect_referrals: 100,
          viral_coefficient: 20.0
      expect(coefficient).toBeLessThanOrEqual(10.0)
    it('should return default coefficient on error', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Query failed'))
      expect(coefficient).toBe(1.0)
    it('should handle users with no referrals', async () => {
          direct_referrals: 0,
          indirect_referrals: 0,
          viral_coefficient: 0
      expect(coefficient).toBe(0)
  describe('Performance and Security Tests', () => {
    it('should handle high-volume calculations efficiently', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(ViralRewardEngine.calculateViralReward(
          `referrer-${i}`,
          `referee-${i}`,
          'signup'
        ))
      }
      await Promise.all(promises)
      const totalTime = Date.now() - startTime
      const avgTime = totalTime / 10
      expect(avgTime).toBeLessThan(100) // Each calculation under 100ms
    it('should validate input sanitization', async () => {
      const maliciousInput = '<script>alert("xss")</script>'
        maliciousInput,
    it('should prevent reward calculation overflow', async () => {
        Number.MAX_SAFE_INTEGER
      expect(result.referrer_reward.final_amount).toBeLessThan(10000)
      expect(result.total_system_cost).toBeLessThan(20000)
    it('should handle concurrent processing safely', async () => {
      const userId = 'test-user'
      for (let i = 0; i < 5; i++) {
        promises.push(ViralRewardEngine.calculateViralCoefficient(userId))
      const results = await Promise.all(promises)
      // All results should be consistent
      expect(new Set(results).size).toBeLessThanOrEqual(2) // Allow for minor variations
  describe('Edge Cases', () => {
    it('should handle zero-value conversions', async () => {
        0
      expect(result.referrer_reward.final_amount).toBeGreaterThanOrEqual(0)
      expect(result.referee_reward.final_amount).toBeGreaterThanOrEqual(0)
    it('should handle negative conversion values', async () => {
        -100
    it('should handle same user as referrer and referee', async () => {
        'same-user-id',
    it('should handle invalid referral types', async () => {
        'invalid_type' as any
    it('should handle expired campaign configurations', async () => {
      const expiredCampaign = {
        ends_at: new Date(Date.now() - 86400000), // Yesterday
        is_active: false
        undefined,
        expiredCampaign
      // Should still process but without campaign bonuses
  describe('Integration Points', () => {
    it('should integrate with tier system correctly', async () => {
      // Mock different tier responses
        if (fnName.includes('analytics')) {
              successful_referrals: 50, // Platinum tier
              viral_coefficient: 3.5,
              network_depth: 4
        return Promise.resolve({ data: [{}] })
        'platinum-user',
      expect(result.referrer_reward.tier_multiplier).toBeGreaterThan(1.5)
    it('should handle campaign-specific configurations', async () => {
      const campaignConfig = {
        viral_multiplier_bonus: 1.2,
        max_reward_cap: 1000
        500,
        campaignConfig
