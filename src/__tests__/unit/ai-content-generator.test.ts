import { AIContentGenerator } from '@/lib/services/ai-content-generator';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import type { CampaignContext, PersonalizationData } from '@/lib/services/ai-content-generator';

// Mock OpenAI
vi.mock('openai', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  variants: [
                    {
                      text: 'Your Wedding Photos Are Ready - See the Magic! ✨',
                      predictedOpenRate: 0.42,
                      aiConfidence: 0.89,
                      personalizedElements: ['wedding_context', 'emotional_trigger']
                    },
                      text: 'Emma\'s Latest Wedding Album - Inspiration for Sarah',
                      predictedOpenRate: 0.38,
                      aiConfidence: 0.85,
                      personalizedElements: ['referrer_name', 'recipient_name', 'viral_context']
                    }
                  ],
                  expectedPerformance: 0.40
                })
              }
            }
          ]
        })
      }
    }
  }))
}));
// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user123',
              userType: 'photographer',
              businessType: 'Wedding Photography',
              experienceLevel: 'expert'
          })
        }))
      }))
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user123' } } }
      })
// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
describe('AIContentGenerator', () => {
  let aiContentGenerator: AIContentGenerator;
  beforeEach(() => {
    vi.clearAllMocks();
    aiContentGenerator = AIContentGenerator.getInstance();
  });
  describe('Subject Line Generation', () => {
    const mockCampaignContext: CampaignContext = {
      campaignType: 'viral_invitation',
      recipientType: 'supplier',
      recipientRole: 'florist',
      goal: 'viral_growth',
      weddingDate: '2025-06-15',
      venueType: 'garden',
      season: 'summer',
      relationship: 'cross_supplier',
      businessType: 'Floral Design',
      experienceLevel: 'intermediate'
    };
    it('should generate subject line variants with AI optimization', async () => {
      const result = await AIContentGenerator.generateEmailSubjectLines(
        mockCampaignContext,
        2
      );
      expect(result).toHaveProperty('variants');
      expect(result.variants).toHaveLength(2);
      expect(result.variants[0]).toHaveProperty('text');
      expect(result.variants[0]).toHaveProperty('predictedOpenRate');
      expect(result.variants[0]).toHaveProperty('aiConfidence');
      expect(result.variants[0]).toHaveProperty('personalizedElements');
      expect(result.variants[0].predictedOpenRate).toBeGreaterThan(0);
      expect(result.variants[0].aiConfidence).toBeGreaterThan(0);
    });
    it('should handle different campaign types', async () => {
      const contexts: CampaignContext[] = [
        { ...mockCampaignContext, campaignType: 'nurture' },
        { ...mockCampaignContext, campaignType: 'conversion' },
        { ...mockCampaignContext, campaignType: 'retention' },
        { ...mockCampaignContext, campaignType: 'super_connector' }
      ];
      for (const context of contexts) {
        const result = await AIContentGenerator.generateEmailSubjectLines(context, 1);
        expect(result.variants).toHaveLength(1);
    it('should validate campaign context input', async () => {
      const invalidContext = {
        ...mockCampaignContext,
        campaignType: 'invalid_type' as any
      };
      await expect(
        AIContentGenerator.generateEmailSubjectLines(invalidContext, 1)
      ).rejects.toThrow();
  describe('Content Optimization', () => {
    const mockPersonalizationData: PersonalizationData = {
      userType: 'photographer',
      businessType: 'Wedding Photography',
      experienceLevel: 'expert',
      recentActivity: ['completed_wedding', 'uploaded_photos'],
      viralInfluencerLevel: 'super_connector',
      networkValue: 0.85
    const baseContent = `
      Hi there,
      
      I wanted to share some exciting news about our latest wedding photography services.
      We've been working with amazing couples and creating beautiful memories.
      Best regards,
      The Team
    `;
    it('should optimize email content with personalization', async () => {
      // Mock OpenAI response for content optimization
      const mockOptimizedContent = {
        optimizedHTML: '<p>Personalized content with wedding context</p>',
        optimizedPlainText: 'Personalized content with wedding context',
        keyChanges: ['Added personalization', 'Improved call-to-action'],
        expectedLift: 0.23
      (AIContentGenerator as unknown).openai.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockOptimizedContent)
          }
        ]
      });
      const result = await AIContentGenerator.optimizeEmailContent(
        baseContent,
        mockPersonalizationData,
        'conversion'
      expect(result).toHaveProperty('optimizedHTML');
      expect(result).toHaveProperty('optimizedPlainText');
      expect(result).toHaveProperty('keyChanges');
      expect(result).toHaveProperty('expectedLift');
      expect(result.expectedLift).toBeGreaterThan(0);
    it('should sanitize personalization data before AI processing', async () => {
      const unsafePersonalizationData = {
        ...mockPersonalizationData,
        email_addresses: 'test@example.com', // Should be removed
        phone_numbers: '123-456-7890' // Should be removed
      } as any;
      // The method should still work but with sanitized data
        AIContentGenerator.optimizeEmailContent(
          baseContent,
          unsafePersonalizationData,
          'engagement'
        )
      ).resolves.toBeDefined();
  describe('Performance Prediction', () => {
    const mockCampaignConfig = {
      type: 'viral_invitation',
      contentQuality: 0.87,
      personalizationLevel: 'advanced',
      scheduledTime: new Date().toISOString(),
      qualityScore: 0.85
    const mockAudienceData = [
      { userType: 'photographer', engagementScore: 0.75 },
      { userType: 'florist', engagementScore: 0.68 },
      { userType: 'venue', engagementScore: 0.82 }
    ];
    it('should predict campaign performance accurately', async () => {
      const mockPrediction = {
        predictedOpenRate: 0.34,
        predictedClickRate: 0.08,
        predictedConversionRate: 0.12,
        confidenceScore: 0.87,
        recommendedSendTime: new Date(),
        audienceSegmentScore: 0.79
              content: JSON.stringify(mockPrediction)
      const result = await AIContentGenerator.predictCampaignPerformance(
        mockCampaignConfig,
        mockAudienceData
      expect(result).toHaveProperty('predictedOpenRate');
      expect(result).toHaveProperty('predictedClickRate');
      expect(result).toHaveProperty('predictedConversionRate');
      expect(result).toHaveProperty('confidenceScore');
      expect(result.predictedOpenRate).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
    it('should handle empty audience data gracefully', async () => {
        AIContentGenerator.predictCampaignPerformance(mockCampaignConfig, [])
  describe('A/B Test Optimization', () => {
    const mockTestResults = [
      {
        id: 'variant_a',
        openRate: 0.32,
        clickRate: 0.06,
        conversionRate: 0.10
      },
        id: 'variant_b',
        openRate: 0.38,
        clickRate: 0.08,
        conversionRate: 0.14
        id: 'variant_c',
        openRate: 0.29,
        clickRate: 0.05,
        conversionRate: 0.08
    it('should identify winning variant and provide optimization insights', async () => {
      const mockOptimization = {
        winningVariant: 'variant_b',
        confidence: 0.95,
        improvementRecommendations: [
          'Use variant_b subject line style',
          'Apply variant_b personalization approach'
        ],
        expectedLift: 0.18
              content: JSON.stringify(mockOptimization)
      const result = await AIContentGenerator.optimizeABTestAutomatically(
        'campaign_123',
        mockTestResults
      expect(result).toHaveProperty('winningVariant');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('improvementRecommendations');
      expect(result.winningVariant).toBe('variant_b');
      expect(result.confidence).toBeGreaterThan(0.5);
    it('should require minimum test results for optimization', async () => {
      const insufficientResults = mockTestResults.slice(0, 1);
        AIContentGenerator.optimizeABTestAutomatically('campaign_123', insufficientResults)
      ).rejects.toThrow('Insufficient test results');
  describe('Security and Validation', () => {
    it('should sanitize forbidden data from personalization input', () => {
      const unsafeData = {
        userType: 'photographer' as const,
        businessType: 'Wedding Photography',
        experienceLevel: 'expert' as const,
        recentActivity: ['activity1'],
        email_addresses: 'test@example.com',
        phone_numbers: '123-456-7890',
        payment_info: '4111-1111-1111-1111'
      const sanitized = (AIContentGenerator as unknown).sanitizePersonalizationData(unsafeData);
      expect(sanitized).not.toHaveProperty('email_addresses');
      expect(sanitized).not.toHaveProperty('phone_numbers');
      expect(sanitized).not.toHaveProperty('payment_info');
      expect(sanitized).toHaveProperty('userType');
      expect(sanitized).toHaveProperty('businessType');
    it('should validate campaign context schema', () => {
      const validContext = {
        campaignType: 'viral_invitation',
        recipientType: 'supplier',
        personalizationLevel: 'basic',
        includePersonalData: false
      const result = (AIContentGenerator as unknown).AI_CONTENT_SCHEMA.safeParse(validContext);
      expect(result.success).toBe(true);
    it('should reject invalid campaign context', () => {
        campaignType: 'invalid_type',
        includePersonalData: true // Should be false
      const result = (AIContentGenerator as unknown).AI_CONTENT_SCHEMA.safeParse(invalidContext);
      expect(result.success).toBe(false);
  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      (AIContentGenerator as unknown).openai.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API Error')
      const mockCampaignContext: CampaignContext = {
        recipientRole: 'florist',
        goal: 'viral_growth',
        season: 'summer',
        relationship: 'cross_supplier'
        AIContentGenerator.generateEmailSubjectLines(mockCampaignContext, 1)
      ).rejects.toThrow('OpenAI API Error');
    it('should handle malformed AI responses', async () => {
              content: 'Invalid JSON response'
});
