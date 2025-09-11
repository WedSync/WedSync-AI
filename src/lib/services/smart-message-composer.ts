/**
 * WS-155: Smart Message Composition with AI Assistance
 * Advanced mobile messaging with AI-powered suggestions and templates
 */

import OpenAI from 'openai';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

// Message composition request schema
const MessageCompositionRequest = z.object({
  guestId: z.string(),
  weddingId: z.string(),
  context: z.enum(['invitation', 'reminder', 'update', 'thank_you', 'custom']),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']),
  language: z.string().default('en'),
  customPrompt: z.string().optional(),
  includeDetails: z
    .object({
      eventDate: z.boolean().default(true),
      venue: z.boolean().default(true),
      rsvpStatus: z.boolean().default(false),
      personalizedGreeting: z.boolean().default(true),
    })
    .optional(),
});

// AI suggestion response
interface AISuggestion {
  id: string;
  message: string;
  confidence: number;
  tone: string;
  estimatedReadTime: number;
  keywords: string[];
}

// Message template
interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  usage_count: number;
}

export class SmartMessageComposer {
  private openai: OpenAI | null = null;
  private templates: Map<string, MessageTemplate> = new Map();
  private userPreferences: Map<string, any> = new Map();

  constructor() {
    this.initializeOpenAI();
    this.loadTemplates();
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  private async loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (!error && data) {
        data.forEach((template) => {
          this.templates.set(template.id, template);
        });
      }
    } catch (err) {
      console.error('Error loading message templates:', err);
    }
  }

  /**
   * Generate AI-powered message suggestions
   */
  async generateSuggestions(
    request: z.infer<typeof MessageCompositionRequest>,
  ): Promise<AISuggestion[]> {
    const validatedRequest = MessageCompositionRequest.parse(request);
    const suggestions: AISuggestion[] = [];

    try {
      // Get guest and wedding context
      const context = await this.getMessageContext(
        validatedRequest.guestId,
        validatedRequest.weddingId,
      );

      // Generate AI suggestions if available
      if (this.openai) {
        const aiSuggestions = await this.generateAISuggestions(
          validatedRequest,
          context,
        );
        suggestions.push(...aiSuggestions);
      }

      // Add template-based suggestions
      const templateSuggestions = await this.getTemplateSuggestions(
        validatedRequest,
        context,
      );
      suggestions.push(...templateSuggestions);

      // Apply user preferences and personalization
      const personalizedSuggestions = await this.personalizeMessages(
        suggestions,
        context,
      );

      // Sort by confidence and relevance
      return personalizedSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
    } catch (error) {
      console.error('Error generating message suggestions:', error);
      return this.getFallbackSuggestions(validatedRequest);
    }
  }

  /**
   * Generate AI suggestions using OpenAI
   */
  private async generateAISuggestions(
    request: z.infer<typeof MessageCompositionRequest>,
    context: any,
  ): Promise<AISuggestion[]> {
    if (!this.openai) return [];

    try {
      const prompt = this.buildAIPrompt(request, context);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional wedding communication specialist. Generate personalized, appropriate messages for wedding guests.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        n: 3, // Generate 3 variations
      });

      return completion.choices.map((choice, index) => ({
        id: `ai-${Date.now()}-${index}`,
        message: choice.message?.content || '',
        confidence: 0.9 - index * 0.1,
        tone: request.tone,
        estimatedReadTime: this.calculateReadTime(
          choice.message?.content || '',
        ),
        keywords: this.extractKeywords(choice.message?.content || ''),
      }));
    } catch (error) {
      console.error('OpenAI API error:', error);
      return [];
    }
  }

  /**
   * Build AI prompt based on context
   */
  private buildAIPrompt(
    request: z.infer<typeof MessageCompositionRequest>,
    context: any,
  ): string {
    const {
      context: messageType,
      tone,
      includeDetails,
      customPrompt,
    } = request;

    let prompt = `Generate a ${tone} ${messageType} message for a wedding guest.\n\n`;

    if (context.guest) {
      prompt += `Guest: ${context.guest.name}\n`;
      prompt += `Relationship: ${context.guest.relationship || 'Guest'}\n`;
    }

    if (context.wedding) {
      prompt += `Wedding: ${context.wedding.couple_names}\n`;
      if (includeDetails?.eventDate) {
        prompt += `Date: ${context.wedding.event_date}\n`;
      }
      if (includeDetails?.venue) {
        prompt += `Venue: ${context.wedding.venue_name}\n`;
      }
    }

    if (includeDetails?.rsvpStatus && context.rsvp) {
      prompt += `RSVP Status: ${context.rsvp.status}\n`;
    }

    if (customPrompt) {
      prompt += `\nAdditional Instructions: ${customPrompt}\n`;
    }

    prompt += '\nGenerate a concise, mobile-friendly message (max 150 words).';

    return prompt;
  }

  /**
   * Get template-based suggestions
   */
  private async getTemplateSuggestions(
    request: z.infer<typeof MessageCompositionRequest>,
    context: any,
  ): Promise<AISuggestion[]> {
    const relevantTemplates = Array.from(this.templates.values())
      .filter((template) => template.category === request.context)
      .slice(0, 3);

    return relevantTemplates.map((template) => {
      const processedMessage = this.processTemplateVariables(
        template.content,
        context,
      );
      return {
        id: `template-${template.id}`,
        message: processedMessage,
        confidence: 0.75,
        tone: request.tone,
        estimatedReadTime: this.calculateReadTime(processedMessage),
        keywords: template.variables,
      };
    });
  }

  /**
   * Process template variables
   */
  private processTemplateVariables(template: string, context: any): string {
    let message = template;

    const replacements: Record<string, string> = {
      '{guest_name}': context.guest?.name || 'Guest',
      '{couple_names}': context.wedding?.couple_names || 'The Couple',
      '{event_date}': context.wedding?.event_date || 'the wedding date',
      '{venue_name}': context.wedding?.venue_name || 'the venue',
      '{rsvp_deadline}': context.wedding?.rsvp_deadline || 'soon',
      '{website_url}': context.wedding?.website_url || '',
    };

    Object.entries(replacements).forEach(([variable, value]) => {
      message = message.replace(new RegExp(variable, 'g'), value);
    });

    return message;
  }

  /**
   * Personalize messages based on user preferences
   */
  private async personalizeMessages(
    suggestions: AISuggestion[],
    context: any,
  ): Promise<AISuggestion[]> {
    return suggestions.map((suggestion) => {
      // Apply personalization based on guest preferences
      if (
        context.preferences?.preferredLanguage &&
        context.preferences.preferredLanguage !== 'en'
      ) {
        // Could integrate translation service here
        suggestion.keywords.push('needs_translation');
      }

      if (context.guest?.vip) {
        suggestion.confidence += 0.1; // Boost confidence for VIP guests
      }

      return suggestion;
    });
  }

  /**
   * Get message context for guest and wedding
   */
  private async getMessageContext(guestId: string, weddingId: string) {
    const [guestData, weddingData, rsvpData, preferencesData] =
      await Promise.all([
        supabase.from('guests').select('*').eq('id', guestId).single(),
        supabase.from('weddings').select('*').eq('id', weddingId).single(),
        supabase
          .from('rsvps')
          .select('*')
          .eq('guest_id', guestId)
          .eq('wedding_id', weddingId)
          .single(),
        supabase
          .from('guest_preferences')
          .select('*')
          .eq('guest_id', guestId)
          .single(),
      ]);

    return {
      guest: guestData.data,
      wedding: weddingData.data,
      rsvp: rsvpData.data,
      preferences: preferencesData.data,
    };
  }

  /**
   * Calculate estimated read time
   */
  private calculateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60); // Return in seconds
  }

  /**
   * Extract keywords from message
   */
  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
    ]);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word));

    const frequency: Record<string, number> = {};
    words.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get fallback suggestions when AI is unavailable
   */
  private getFallbackSuggestions(
    request: z.infer<typeof MessageCompositionRequest>,
  ): AISuggestion[] {
    const fallbackMessages: Record<string, string[]> = {
      invitation: [
        "We're excited to invite you to our wedding! Please save the date and RSVP at your earliest convenience.",
        "You're invited to celebrate our special day with us! Details and RSVP available on our wedding website.",
        'We would be honored to have you join us for our wedding celebration. Looking forward to seeing you!',
      ],
      reminder: [
        'Just a friendly reminder about our upcoming wedding. We hope you can join us!',
        "Don't forget to RSVP for our wedding if you haven't already. We can't wait to celebrate with you!",
        "Our wedding is coming up soon! Please let us know if you'll be able to attend.",
      ],
      update: [
        'We have an update regarding our wedding details. Please check our website for the latest information.',
        'Important wedding update: Please review the latest information on our wedding website.',
        'Quick update about our wedding arrangements. Visit our website for details.',
      ],
      thank_you: [
        'Thank you so much for being part of our special day! Your presence meant the world to us.',
        "We're grateful you could celebrate with us. Thank you for making our wedding day unforgettable!",
        'Your support and presence at our wedding was truly appreciated. Thank you!',
      ],
      custom: [
        'We wanted to reach out with a message about our wedding.',
        "Here's an important message regarding our upcoming celebration.",
        'We have something to share with you about our wedding.',
      ],
    };

    const messages =
      fallbackMessages[request.context] || fallbackMessages.custom;

    return messages.slice(0, 3).map((message, index) => ({
      id: `fallback-${Date.now()}-${index}`,
      message,
      confidence: 0.6 - index * 0.1,
      tone: request.tone,
      estimatedReadTime: this.calculateReadTime(message),
      keywords: [],
    }));
  }

  /**
   * Save user selection for learning
   */
  async saveUserSelection(
    userId: string,
    suggestionId: string,
    feedback?: 'positive' | 'negative' | 'edited',
  ) {
    try {
      await supabase.from('message_composition_feedback').insert({
        user_id: userId,
        suggestion_id: suggestionId,
        feedback,
        timestamp: new Date().toISOString(),
      });

      // Update template usage count if it's a template
      if (suggestionId.startsWith('template-')) {
        const templateId = suggestionId.replace('template-', '');
        await supabase
          .from('message_templates')
          .update({ usage_count: supabase.raw('usage_count + 1') })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error('Error saving user selection:', error);
    }
  }

  /**
   * Get user's favorite templates
   */
  async getUserFavorites(userId: string): Promise<MessageTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('user_favorite_templates')
        .select('template_id')
        .eq('user_id', userId);

      if (error || !data) return [];

      const favoriteIds = data.map((d) => d.template_id);
      return Array.from(this.templates.values()).filter((t) =>
        favoriteIds.includes(t.id),
      );
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
  }
}

export const smartMessageComposer = new SmartMessageComposer();
