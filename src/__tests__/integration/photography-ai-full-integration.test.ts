/**
 * WS-130 Round 3: Comprehensive Photography AI Integration Tests
 * Tests full team integration with Music AI, Floral AI, Pricing, and Trials
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { photographyAICoordinator } from '@/lib/integrations/photography-ai-coordinator';
import { photographyCache } from '@/lib/cache/photography-cache';
import { photographyRateLimiter } from '@/lib/ratelimit/photography-rate-limiter';
import { FeatureGateService } from '@/lib/billing/featureGating';
// Mock external services
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/openai-service');
vi.mock('@/lib/services/music-ai-service');
vi.mock('@/lib/ml/floral-ai-service');
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: jest.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn(),
  })),
};
const mockClient = {
  id: 'test-client-123',
  organization_id: 'test-org-123',
  wedding_date: new Date('2024-06-15T18:00:00Z'),
  style_preferences: 'romantic'
const mockUser = {
  id: 'test-user-123',
  email: 'test@wedding.com'
const mockAnalysisRequest = {
  client_id: mockClient.id,
  wedding_style: 'romantic',
  preferred_colors: ['#F5F5DC', '#8B4513', '#228B22'],
  wedding_date: '2024-06-15T18:00:00Z',
  mood_board_images: [
    'https://example.com/wedding1.jpg',
    'https://example.com/wedding2.jpg'
  ],
  budget_range: {
    min: 2000,
    max: 5000
  integration_preferences: {
    sync_with_music: true,
    sync_with_floral: true,
    track_usage: true
  }
describe('Photography AI Full Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    // Mock client access
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockClient,
            error: null
          })
        };
      }
      if (table === 'organization_members') {
            data: { role: 'admin' },
      if (table === 'photo_analysis_records') {
          insert: vi.fn().mockResolvedValue({
            data: { id: 'test-record-123' },
      return mockSupabase.from();
    // Clear caches before each test
    await photographyCache.clearAll();
  afterEach(async () => {
    // Cleanup after each test
  describe('POST /api/photography/analyze - Full Integration', () => {
    test('should successfully analyze with all team integrations', async () => {
      // Mock successful analysis from coordinator
      const mockCoordinatedResponse = {
        photography_analysis: {
          mood_board_id: 'mood-123',
          dominant_colors: ['#F5F5DC', '#8B4513'],
          style_analysis: {
            primary_style: 'romantic',
            secondary_styles: ['vintage', 'bohemian'],
            confidence_score: 0.92
          },
          recommendations: [
            {
              type: 'color_palette',
              suggestion: 'Add sage green accents',
              confidence: 0.87
            }
          ]
        },
        style_consistency: {
          style_match_score: 0.89,
          music_recommendations: [
              track_name: 'Perfect by Ed Sheeran',
              style_compatibility: 0.91,
              moment: 'first_dance'
          ],
          cross_domain_coherence: 0.85,
          team_a_integration_score: 0.91
        color_harmony: {
          color_harmony_score: 0.94,
          floral_recommendations: [
              flower_type: 'Garden Roses',
              color: '#F5F5DC',
              harmony_score: 0.96
          seasonal_alignment: 0.88,
          team_b_integration_score: 0.92
        pricing_insights: {
          estimated_cost: 3500,
          feature_accessibility: 'premium_tier',
          usage_impact: 'moderate',
          team_d_integration_score: 0.87
        trial_metrics: {
          usage_count: 1,
          remaining_uses: 99,
          roi_prediction: 0.78,
          conversion_likelihood: 0.65,
          team_e_integration_score: 0.83
        integration_metrics: {
          overall_coherence_score: 0.89,
          processing_time_ms: 2500,
          teams_integrated: ['music_ai', 'floral_ai', 'pricing', 'trials'],
          cache_hit_rate: 0.75,
          api_efficiency: 0.91
        }
      };
      vi.spyOn(photographyAICoordinator, 'analyzeWithFullIntegration')
        .mockResolvedValue(mockCoordinatedResponse);
      // Mock rate limiting as successful
      vi.spyOn(require('@/lib/ratelimit'), 'ratelimit', 'get')
        .mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000
        });
      // Create request
      const request = new NextRequest('http://localhost:3000/api/photography/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAnalysisRequest),
      });
      // Import and call the handler
      const { POST } = await import('@/app/api/photography/analyze/route');
      const response = await POST(request);
      // Verify response
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        photography_analysis: expect.objectContaining({
          dominant_colors: ['#F5F5DC', '#8B4513']
        }),
        style_consistency: expect.objectContaining({
        color_harmony: expect.objectContaining({
        pricing_insights: expect.objectContaining({
        trial_metrics: expect.objectContaining({
        integration_metrics: expect.objectContaining({
          teams_integrated: ['music_ai', 'floral_ai', 'pricing', 'trials']
        })
      }));
      // Verify metadata
      expect(data.metadata).toEqual(expect.objectContaining({
        request_id: expect.any(String),
        processing_time_ms: expect.any(Number),
        api_version: '1.0.0'
      // Verify coordinator was called with correct parameters
      expect(photographyAICoordinator.analyzeWithFullIntegration).toHaveBeenCalledWith({
        client_id: mockAnalysisRequest.client_id,
        user_id: mockUser.id,
        wedding_style: mockAnalysisRequest.wedding_style,
        preferred_colors: mockAnalysisRequest.preferred_colors,
        wedding_date: new Date(mockAnalysisRequest.wedding_date),
        mood_board_images: mockAnalysisRequest.mood_board_images,
        budget_range: mockAnalysisRequest.budget_range,
        integration_preferences: mockAnalysisRequest.integration_preferences
    test('should handle rate limiting correctly', async () => {
      // Mock rate limit exceeded
            success: false,
            remaining: 0,
      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.error.message).toContain('Too many requests');
    test('should validate request parameters', async () => {
      const invalidRequest = {
        client_id: 'invalid-uuid',
        wedding_style: '',
        preferred_colors: [],
        wedding_date: 'invalid-date'
        body: JSON.stringify(invalidRequest),
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.details).toHaveProperty('validation_errors');
    test('should handle authentication errors', async () => {
      // Mock authentication failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    test('should handle client access control', async () => {
      // Mock client not found
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Client not found' }
            })
          };
        return mockSupabase.from();
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('CLIENT_NOT_FOUND');
    test('should handle feature gating', async () => {
      // Mock feature gate denial
      vi.spyOn(FeatureGateService, 'checkFeatureAccess')
        .mockResolvedValue({
          hasAccess: false,
          reason: 'PLAN_LIMIT_EXCEEDED',
          currentUsage: 100,
          planLimit: 100
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FEATURE_ACCESS_DENIED');
    test('should handle internal errors gracefully', async () => {
      // Mock coordinator throwing error
        .mockRejectedValue(new Error('Internal processing error'));
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    test('should log analysis records correctly', async () => {
        photography_analysis: { mood_board_id: 'mood-123' },
        style_consistency: { style_match_score: 0.89 },
        color_harmony: { color_harmony_score: 0.94 },
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'record-123' },
        error: null
        if (table === 'photo_analysis_records') {
          return { insert: mockInsert };
          single: vi.fn().mockResolvedValue({ data: mockClient, error: null })
      await POST(request);
      // Verify analysis was logged
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        analysis_type: 'integrated_mood_board',
        integration_scores: expect.objectContaining({
          style_consistency: 0.89,
          color_harmony: 0.94,
          overall_coherence: 0.89
        teams_integrated: ['music_ai', 'floral_ai', 'pricing', 'trials']
  describe('GET /api/photography/analyze/status', () => {
    test('should return analysis status correctly', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        status: 'completed',
        created_at: '2024-01-01T12:00:00Z',
        processing_time_ms: 2500,
        integration_scores: {
          color_harmony: 0.94
        teams_integrated: ['music_ai', 'floral_ai']
              data: mockAnalysis,
              error: null
      const request = new NextRequest('http://localhost:3000/api/photography/analyze/status?analysis_id=analysis-123');
      const { GET } = await import('@/app/api/photography/analyze/route');
      const response = await GET(request);
        analysis_id: 'analysis-123',
        integration_scores: mockAnalysis.integration_scores,
        teams_integrated: mockAnalysis.teams_integrated
    test('should handle missing analysis_id parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/photography/analyze/status');
      expect(data.error.code).toBe('MISSING_PARAMETER');
    test('should handle analysis not found', async () => {
              error: { message: 'Not found' }
      const request = new NextRequest('http://localhost:3000/api/photography/analyze/status?analysis_id=not-found');
      expect(data.error.code).toBe('ANALYSIS_NOT_FOUND');
});
