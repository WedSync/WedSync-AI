import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiEmailGenerator, AIEmailGenerationRequest } from '@/lib/services/ai-email-generator';

// Mock fetch for AI API calls
global.fetch = vi.fn();
// Mock environment variables
vi.mock('process', () => ({
  env: {
    OPENAI_API_KEY: 'test-api-key',
    AI_MODEL_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    NODE_ENV: 'test'
  }
}));
describe('AI Email Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  describe('generateEmailTemplate', () => {
    it('should generate a welcome email template successfully', async () => {
      // Mock successful AI API response
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              subject: 'Welcome to {{vendor_name}} - Let\'s make your wedding perfect! ✨',
              body_html: '<h1>Welcome {{client_name}}!</h1><p>We\'re excited to work with you.</p>',
              body_text: 'Welcome {{client_name}}! We\'re excited to work with you.',
              variables_used: ['client_name', 'vendor_name'],
              estimated_engagement_score: 0.82,
              key_points: ['Welcome message', 'Excitement', 'Next steps'],
              call_to_action: 'Schedule Your Consultation'
            })
          }
        }]
      };
      (global.fetch as unknown).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse)
      });
      const request: AIEmailGenerationRequest = {
        context: {
          communication_purpose: 'Welcome new client to vendor services',
          relationship_stage: 'new_client',
          client_name: 'Sarah Johnson',
          vendor_name: 'Elite Wedding Photography'
        },
        style_preferences: {
          use_emojis: true,
          include_personal_touches: true,
          formal_language: false,
          include_vendor_branding: true,
          template_structure: 'standard'
        personalization_data: {
          client_preferences: {
            communication_style: 'friendly',
            preferred_name: 'Sarah'
          },
          wedding_details: {
            guest_count: 150,
            budget_tier: 'luxury'
        template_type: 'welcome',
        tone: 'friendly',
        length: 'medium',
        include_call_to_action: true
      const result = await aiEmailGenerator.generateEmailTemplate(request);
      expect(result.success).toBe(true);
      expect(result.generated_template).toBeDefined();
      expect(result.generated_template.subject).toContain('Welcome to {{vendor_name}}');
      expect(result.generated_template.variables_used).toContain('client_name');
      expect(result.generated_template.variables_used).toContain('vendor_name');
      expect(result.generated_template.estimated_engagement_score).toBeGreaterThan(0.8);
      expect(result.personalization_score).toBeGreaterThan(0.7);
      expect(result.generation_metadata.generation_time_ms).toBeGreaterThan(0);
    });
    it('should handle API failures gracefully', async () => {
      // Mock API failure
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
          communication_purpose: 'Test email',
          relationship_stage: 'existing_client'
          use_emojis: false,
        personalization_data: {},
        tone: 'professional',
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Should still provide a fallback template
      expect(result.generated_template.subject).toBeDefined();
    it('should generate different template types correctly', async () => {
      const mockPaymentReminderResponse = {
              subject: 'Payment Reminder: {{amount}} due {{due_date}} - {{vendor_name}}',
              body_html: '<h2>Payment Reminder</h2><p>Hi {{client_name}}, your payment of {{amount}} is due on {{due_date}}.</p>',
              body_text: 'Hi {{client_name}}, your payment of {{amount}} is due on {{due_date}}.',
              variables_used: ['client_name', 'vendor_name', 'amount', 'due_date'],
              estimated_engagement_score: 0.75,
              key_points: ['Payment reminder', 'Due date', 'Amount'],
              call_to_action: 'Make Payment Now'
        json: () => Promise.resolve(mockPaymentReminderResponse)
          communication_purpose: 'Remind client about upcoming payment',
          relationship_stage: 'existing_client',
          client_name: 'John Smith',
          vendor_name: 'Dream Wedding Planners'
          formal_language: true,
        template_type: 'payment_reminder',
      expect(result.generated_template.subject).toContain('Payment Reminder');
      expect(result.generated_template.variables_used).toContain('amount');
      expect(result.generated_template.variables_used).toContain('due_date');
      expect(result.generated_template.call_to_action).toBe('Make Payment Now');
    it('should calculate personalization scores correctly', async () => {
      const mockResponse = {
              subject: 'Hi {{client_name}}, update from {{vendor_name}}',
              body_html: '<p>Dear {{client_name}}, we have updates about your {{wedding_date}} wedding at {{venue_name}}.</p>',
              body_text: 'Dear {{client_name}}, we have updates about your {{wedding_date}} wedding at {{venue_name}}.',
              variables_used: ['client_name', 'vendor_name', 'wedding_date', 'venue_name'],
              estimated_engagement_score: 0.8,
              key_points: ['Personal update', 'Wedding details'],
              call_to_action: 'View Details'
        json: () => Promise.resolve(mockResponse)
          communication_purpose: 'Personal update for client',
          client_name: 'Emma Wilson',
          vendor_name: 'Perfect Day Events',
          wedding_date: '2024-06-15',
          venue_name: 'Garden Pavilion'
            communication_style: 'warm',
            preferred_name: 'Emma'
            theme: 'garden',
            guest_count: 120
        template_type: 'client_communication',
        tone: 'warm',
      // High personalization score expected due to multiple personal variables
      expect(result.personalization_score).toBeGreaterThan(0.8);
    it('should generate appropriate alternatives', async () => {
              subject: 'Thank you from {{vendor_name}}!',
              body_html: '<p>Thank you {{client_name}} for choosing us!</p>',
              body_text: 'Thank you {{client_name}} for choosing us!',
              estimated_engagement_score: 0.85,
              key_points: ['Gratitude', 'Appreciation'],
              call_to_action: 'Leave a Review'
          communication_purpose: 'Thank client after successful event',
          relationship_stage: 'post_wedding',
          client_name: 'Michael & Jessica',
          vendor_name: 'Artistic Weddings'
        template_type: 'thank_you',
        tone: 'celebratory',
        length: 'short',
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
      
      if (result.alternatives.length > 0) {
        result.alternatives.forEach(alt => {
          expect(alt.subject).toBeDefined();
          expect(alt.body_html).toBeDefined();
          expect(alt.estimated_engagement_score).toBeGreaterThan(0);
        });
      }
  describe('refineEmailTemplate', () => {
    it('should refine template with specific instructions', async () => {
      const mockTemplate = {
        id: 'test-template',
        name: 'Test Template',
        subject: 'Update from vendor',
        content: '<p>Generic update message</p>',
        category: 'client_communication' as const,
        status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        usage_count: 0,
        is_favorite: false,
        variables: ['client_name'],
        metadata: {
          description: 'Test template'
        }
      const mockRefinedResponse = {
              subject: 'Important update from {{vendor_name}} regarding your wedding',
              body_html: '<p>Dear {{client_name}}, we have an urgent update about your upcoming wedding that requires your immediate attention.</p>',
              body_text: 'Dear {{client_name}}, we have an urgent update about your upcoming wedding that requires your immediate attention.',
              estimated_engagement_score: 0.9,
              key_points: ['Urgency', 'Personal attention', 'Wedding focus'],
              call_to_action: 'Contact Us Immediately'
        json: () => Promise.resolve(mockRefinedResponse)
      const result = await aiEmailGenerator.refineEmailTemplate(
        mockTemplate,
        'Make this more urgent and personal, add wedding-specific context',
        {
          communication_purpose: 'Urgent wedding update',
          client_name: 'Sarah',
          vendor_name: 'Elite Events',
      );
      expect(result.generated_template.subject).toContain('Important update');
      expect(result.generated_template.subject).toContain('wedding');
      expect(result.generated_template.estimated_engagement_score).toBeGreaterThan(0.85);
      expect(result.generated_template.key_points).toContain('Urgency');
  describe('generateTemplateVariations', () => {
    it('should generate multiple variations of a base template', async () => {
      const baseRequest: AIEmailGenerationRequest = {
          communication_purpose: 'Meeting confirmation',
          client_name: 'Jennifer Brown',
          vendor_name: 'Elegant Affairs'
        template_type: 'meeting_confirmation',
      // Mock multiple API calls for variations
      const mockVariation1 = {
              subject: 'Meeting confirmed with {{vendor_name}}',
              body_html: '<p>Hi {{client_name}}, your meeting is confirmed.</p>',
              body_text: 'Hi {{client_name}}, your meeting is confirmed.',
              key_points: ['Confirmation', 'Meeting details'],
              call_to_action: 'Add to Calendar'
      const mockVariation2 = {
              subject: 'Your consultation with {{vendor_name}} is all set!',
              body_html: '<p>Dear {{client_name}}, we\'re excited for our upcoming consultation.</p>',
              body_text: 'Dear {{client_name}}, we\'re excited for our upcoming consultation.',
              key_points: ['Excitement', 'Consultation', 'Preparation'],
              call_to_action: 'Prepare Your Questions'
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVariation1)
        })
          json: () => Promise.resolve(mockVariation2)
      const variations = await aiEmailGenerator.generateTemplateVariations(baseRequest, 2);
      expect(variations).toHaveLength(2);
      expect(variations[0].subject).toBeDefined();
      expect(variations[1].subject).toBeDefined();
      expect(variations[0].subject).not.toBe(variations[1].subject);
  describe('Fallback behavior', () => {
    it('should provide fallback templates when API is unavailable', async () => {
      // Create instance without API key
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = '';
          communication_purpose: 'Test fallback',
      expect(result.generated_template.body_html).toBeDefined();
      expect(result.generation_metadata.model_used).toContain('fallback');
      // Restore original environment
      process.env.OPENAI_API_KEY = originalEnv;
    it('should handle malformed API responses gracefully', async () => {
      // Mock malformed response
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'Invalid JSON content'
            }
          }]
          communication_purpose: 'Test malformed response',
  describe('Performance and validation', () => {
    it('should complete generation within reasonable time', async () => {
              subject: 'Test subject',
              body_html: '<p>Test content</p>',
              body_text: 'Test content',
              variables_used: [],
              estimated_engagement_score: 0.7,
              key_points: ['Test'],
              call_to_action: 'Test Action'
      const startTime = Date.now();
      const result = await aiEmailGenerator.generateEmailTemplate({
          communication_purpose: 'Performance test',
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.generation_metadata.generation_time_ms).toBeLessThan(duration);
    it('should validate required request fields', async () => {
      const invalidRequest = {} as AIEmailGenerationRequest;
      const result = await aiEmailGenerator.generateEmailTemplate(invalidRequest);
      expect(result.error).toContain('Communication purpose is required');
    it('should sanitize and validate template content', async () => {
              subject: 'Valid subject with {{client_name}}',
              body_html: '<p>Safe HTML content for {{client_name}}</p>',
              body_text: 'Safe text content for {{client_name}}',
              variables_used: ['client_name'],
              key_points: ['Safety', 'Validation'],
              call_to_action: 'Safe Action'
          communication_purpose: 'Content validation test',
          client_name: 'Test Client'
      expect(result.generated_template.subject).not.toContain('<script>');
      expect(result.generated_template.body_html).not.toContain('<script>');
});
