import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST, GET, PUT } from '@/app/api/ai-email-templates/route';

// Mock dependencies
vi.mock('@/lib/services/ai-email-generator');
vi.mock('@/lib/services/email-personalization-engine');
vi.mock('@supabase/supabase-js');
// Mock successful AI response
const mockAIResponse = {
  success: true,
  generated_template: {
    subject: 'Welcome to {{vendor_name}} - Let\'s make your wedding perfect! ✨',
    body_html: '<h2>Welcome {{client_name}}!</h2><p>We\'re excited to work with you.</p>',
    body_text: 'Welcome {{client_name}}! We\'re excited to work with you.',
    variables_used: ['client_name', 'vendor_name'],
    estimated_engagement_score: 0.85,
    key_points: ['Welcome', 'Excitement', 'Partnership'],
    call_to_action: 'Schedule Your Consultation'
  },
  alternatives: [
    {
      subject: 'Hi {{client_name}}, welcome to {{vendor_name}}!',
      body_html: '<p>Hello {{client_name}}! We can\'t wait to help with your wedding.</p>',
      body_text: 'Hello {{client_name}}! We can\'t wait to help with your wedding.',
      variables_used: ['client_name', 'vendor_name'],
      estimated_engagement_score: 0.82,
      key_points: ['Greeting', 'Anticipation', 'Service'],
      call_to_action: 'Get Started'
    }
  ],
  personalization_score: 0.88,
  tone_match_score: 0.91,
  suggestions: [
      type: 'subject_alternative',
      suggestion: 'Consider adding urgency to increase open rates',
      reasoning: 'Urgent subject lines perform 15% better',
      impact_score: 0.7
  generation_metadata: {
    model_used: 'gpt-4',
    generation_time_ms: 1250,
    confidence_score: 0.89,
    tokens_used: 1200
  }
};
// Mock personalization data
const mockPersonalizationRecommendations = [
  {
    field: 'subject_line',
    recommendation: 'Use client\'s preferred name in subject',
    reasoning: 'Personalized subjects have 26% higher open rates',
    confidence: 0.85,
    impact_score: 0.8
    field: 'send_time',
    recommendation: 'Send emails at 10:00 AM',
    reasoning: 'Client shows highest engagement at this time',
    confidence: 0.75,
    impact_score: 0.7
];
const mockContextualInsights = [
    type: 'timing',
    insight: 'Client is in final month before wedding',
    recommendation: 'Use calm, reassuring tone',
    priority: 'high'
    type: 'content',
    insight: 'Client prefers detailed information',
    recommendation: 'Include comprehensive details',
    priority: 'medium'
describe('AI Email Templates API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the AI generator service
    vi.mocked(require('@/lib/services/ai-email-generator').aiEmailGenerator.generateEmailTemplate)
      .mockResolvedValue(mockAIResponse);
    vi.mocked(require('@/lib/services/ai-email-generator').aiEmailGenerator.refineEmailTemplate)
    vi.mocked(require('@/lib/services/ai-email-generator').aiEmailGenerator.generateTemplateVariations)
      .mockResolvedValue([mockAIResponse.generated_template, ...mockAIResponse.alternatives]);
    // Mock the personalization engine
    vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.getPersonalizationRecommendations)
      .mockResolvedValue(mockPersonalizationRecommendations);
    vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.getContextualInsights)
      .mockResolvedValue(mockContextualInsights);
    vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.enhanceEmailRequest)
      .mockImplementation(async (request) => request);
    vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.trackEmailEngagement)
      .mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.resetAllMocks();
  describe('POST /api/ai-email-templates', () => {
    describe('generate action', () => {
      it('should generate email template successfully', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'user-agent': 'test-agent'
          },
          body: {
            action: 'generate',
            context: {
              communication_purpose: 'Welcome new client to photography services',
              relationship_stage: 'new_client',
              client_name: 'Sarah Johnson',
              vendor_name: 'Elite Photography'
            },
            template_type: 'welcome',
            tone: 'friendly',
            length: 'medium',
            include_call_to_action: true,
            style_preferences: {
              use_emojis: true,
              include_personal_touches: true,
              formal_language: false,
              include_vendor_branding: true,
              template_structure: 'standard'
            }
          }
        });
        const response = await POST(req as unknown);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.generated_template).toBeDefined();
        expect(data.data.generated_template.subject).toContain('Welcome');
        expect(data.data.personalization_score).toBeGreaterThan(0.8);
        expect(data.metadata.generation_time_ms).toBeGreaterThan(0);
      });
      it('should enhance request with personalization when client_id provided', async () => {
            'content-type': 'application/json'
            client_id: 'client_123',
            vendor_id: 'vendor_456',
              communication_purpose: 'Personalized welcome',
              relationship_stage: 'new_client'
            tone: 'professional'
        expect(data.metadata.personalized).toBe(true);
      it('should validate required fields', async () => {
            // Missing required fields
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('context and template_type are required');
      it('should handle generation failures gracefully', async () => {
        // Mock failure
        vi.mocked(require('@/lib/services/ai-email-generator').aiEmailGenerator.generateEmailTemplate)
          .mockResolvedValueOnce({
            success: false,
            error: 'AI service unavailable'
          });
              communication_purpose: 'Test generation failure',
              relationship_stage: 'existing_client'
            template_type: 'welcome'
        expect(response.status).toBe(500);
    });
    describe('refine action', () => {
      it('should refine existing template successfully', async () => {
        const mockTemplate = {
          id: 'template_123',
          name: 'Test Template',
          subject: 'Generic subject',
          content: '<p>Generic content</p>',
          category: 'welcome' as const,
          status: 'active' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          usage_count: 0,
          is_favorite: false,
          variables: ['client_name'],
          metadata: {
            description: 'Test template'
        };
            action: 'refine',
            template: mockTemplate,
            refinement_instructions: 'Make this more personal and add urgency'
      it('should validate refinement parameters', async () => {
            action: 'refine'
            // Missing template and instructions
        expect(data.error).toContain('template and refinement_instructions are required');
    describe('variations action', () => {
      it('should generate template variations successfully', async () => {
            action: 'variations',
            base_request: {
              context: {
                communication_purpose: 'Meeting confirmation',
                relationship_stage: 'existing_client'
              },
              template_type: 'meeting_confirmation',
              tone: 'professional'
            variation_count: 2
        expect(data.data.variations).toBeDefined();
        expect(Array.isArray(data.data.variations)).toBe(true);
    describe('personalize action', () => {
      it('should personalize template for specific client', async () => {
        // Mock personalization profile
        const mockProfile = {
          client_id: 'client_123',
          vendor_id: 'vendor_456',
          communication_preferences: {
            preferred_tone: 'warm',
            frequency_preference: 'regular',
            content_length: 'medium',
            include_emojis: false,
            language: 'en',
            time_zone: 'America/New_York'
          behavioral_data: {
            email_engagement: {
              open_rate: 0.8,
              click_rate: 0.4,
              response_rate: 0.2,
              preferred_subject_types: ['personalized'],
              engagement_days: ['Monday', 'Wednesday'],
              engagement_times: [10, 14]
            communication_patterns: {
              response_time_avg_hours: 24,
              preferred_communication_channels: ['email'],
              decision_making_style: 'deliberate'
            content_preferences: {
              likes_detailed_info: true,
              prefers_visual_content: false,
              responds_to_urgency: false,
              values_personal_touch: true
          wedding_context: {
            wedding_date: '2024-06-15',
            days_until_wedding: 120,
            wedding_phase: 'mid_planning',
            venue_type: 'outdoor',
            guest_count: 150,
            budget_tier: 'luxury',
            wedding_style: 'modern',
            special_requirements: [],
            vendor_relationships: []
          interaction_history: [],
          personalization_score: 0.85,
          last_updated: new Date().toISOString()
        vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.getPersonalizationProfile)
          .mockResolvedValueOnce(mockProfile);
            action: 'personalize',
            base_template: {
              category: 'welcome',
              subject: 'Welcome to our services',
              content: '<p>Generic welcome message</p>'
        expect(data.data.personalization_profile).toBeDefined();
    describe('Rate limiting', () => {
      it('should enforce rate limits', async () => {
        const requests = Array.from({ length: 12 }, (_, i) => 
          createMocks({
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'test-rate-limit',
              'x-forwarded-for': '192.168.1.1'
            body: {
              action: 'generate',
                communication_purpose: `Test ${i}`,
              template_type: 'welcome'
          }).req
        );
        const responses = [];
        
        // Send 12 requests rapidly
        for (const req of requests) {
          const response = await POST(req as unknown);
          responses.push(response);
        }
        // Check that some requests were rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
  describe('GET /api/ai-email-templates', () => {
    describe('recommendations action', () => {
      it('should return personalization recommendations', async () => {
          method: 'GET',
          query: {
            action: 'recommendations',
        const response = await GET(req as unknown);
        expect(data.data.recommendations).toBeDefined();
        expect(Array.isArray(data.data.recommendations)).toBe(true);
        if (data.data.recommendations.length > 0) {
          expect(data.data.recommendations[0]).toHaveProperty('field');
          expect(data.data.recommendations[0]).toHaveProperty('recommendation');
          expect(data.data.recommendations[0]).toHaveProperty('confidence');
      it('should require client_id parameter', async () => {
            action: 'recommendations'
            // Missing client_id
        expect(data.error).toContain('client_id is required');
    describe('insights action', () => {
      it('should return contextual insights', async () => {
            action: 'insights',
            template_type: 'meeting_confirmation'
        expect(data.data.insights).toBeDefined();
        expect(Array.isArray(data.data.insights)).toBe(true);
        if (data.data.insights.length > 0) {
          expect(data.data.insights[0]).toHaveProperty('type');
          expect(data.data.insights[0]).toHaveProperty('insight');
          expect(data.data.insights[0]).toHaveProperty('priority');
    describe('profile action', () => {
      it('should return client personalization profile', async () => {
          communication_preferences: {},
          behavioral_data: {},
          wedding_context: {},
            action: 'profile',
            client_id: 'client_123'
        expect(data.data.profile).toBeDefined();
        expect(data.data.profile.client_id).toBe('client_123');
  describe('PUT /api/ai-email-templates', () => {
    it('should track email engagement successfully', async () => {
      const { req } = createMocks({
        method: 'PUT',
        headers: {
          'content-type': 'application/json'
        },
        body: {
          email_data: {
            subject: 'Welcome to our services',
            sent_at: '2024-01-15T10:00:00Z',
            opened_at: '2024-01-15T10:30:00Z',
            clicked_at: '2024-01-15T11:00:00Z'
      const response = await PUT(req as unknown);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('tracked successfully');
    it('should validate required tracking parameters', async () => {
          // Missing client_id and email_data
          vendor_id: 'vendor_456'
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('client_id and email_data are required');
    it('should handle tracking errors gracefully', async () => {
      // Mock tracking failure
      vi.mocked(require('@/lib/services/email-personalization-engine').emailPersonalizationEngine.trackEmailEngagement)
        .mockRejectedValueOnce(new Error('Database connection failed'));
            subject: 'Test subject',
            sent_at: '2024-01-15T10:00:00Z'
      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to track email engagement');
  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
        method: 'POST',
        body: '{ invalid json'
      // Mock JSON parsing error
      vi.spyOn(req, 'json').mockRejectedValueOnce(new Error('Invalid JSON'));
      const response = await POST(req as unknown);
      expect(data.error).toBe('Internal server error');
    it('should handle unknown actions', async () => {
          action: 'unknown_action'
      expect(data.error).toContain('Invalid action');
    it('should provide appropriate error details in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      // Mock service error
      vi.mocked(require('@/lib/services/ai-email-generator').aiEmailGenerator.generateEmailTemplate)
        .mockRejectedValueOnce(new Error('Detailed development error'));
          action: 'generate',
          context: {
            communication_purpose: 'Error test',
            relationship_stage: 'existing_client'
          template_type: 'welcome'
      expect(data.details).toBeDefined();
      expect(data.details).toContain('Detailed development error');
      process.env.NODE_ENV = originalEnv;
});
