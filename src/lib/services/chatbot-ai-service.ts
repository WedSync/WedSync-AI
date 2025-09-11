// ==========================================
// WS-243: AI Chatbot OpenAI Integration Service
// ==========================================

import OpenAI from 'openai';
import type {
  AIServiceRequest,
  AIServiceResponse,
  ChatbotMessage,
  ChatbotPrompt,
  UserContext,
  WeddingContext,
} from '../../types/chatbot';

// ==========================================
// OpenAI Service Configuration
// ==========================================

export class ChatbotAIService {
  private openai: OpenAI;
  private readonly maxTokens: number = 1500;
  private readonly temperature: number = 0.7;
  private readonly model: string = 'gpt-4';

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // ==========================================
  // Main Message Processing
  // ==========================================

  async processMessage(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();

    try {
      // Build conversation context
      const messages = await this.buildConversationMessages(
        request.message,
        request.conversation_history,
        request.user_context,
        request.wedding_context,
      );

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const choice = completion.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response generated from OpenAI');
      }

      const responseTime = Date.now() - startTime;

      return {
        content: choice.message.content,
        tokens_used: completion.usage?.total_tokens || 0,
        response_time_ms: responseTime,
        metadata: {
          model: completion.model,
          temperature: this.temperature,
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          finish_reason: choice.finish_reason || 'stop',
        },
      };
    } catch (error) {
      console.error('OpenAI API error:', error);

      // Return fallback response
      return this.getFallbackResponse(request.message, Date.now() - startTime);
    }
  }

  // ==========================================
  // Wedding Industry System Prompts
  // ==========================================

  private getSystemPrompt(
    userContext: UserContext,
    weddingContext?: WeddingContext,
  ): string {
    const basePrompt = `You are a professional AI assistant specializing in wedding planning and coordination for ${userContext.organization_id}. You help couples, vendors, and wedding professionals manage their wedding planning process efficiently.

Your expertise includes:
- Wedding timeline creation and management
- Vendor coordination and communication
- Budget planning and tracking
- Guest management and logistics
- Wedding day coordination
- Industry best practices and trends
- Problem-solving for common wedding challenges

Guidelines for responses:
1. Always be warm, professional, and supportive
2. Ask clarifying questions when you need more information
3. Provide specific, actionable advice
4. Reference relevant wedding dates, vendor details, or client preferences when available
5. Suggest practical solutions for wedding planning challenges
6. Keep responses concise but comprehensive
7. When appropriate, recommend consulting with human wedding coordinators for complex issues`;

    // Add wedding-specific context if available
    if (weddingContext && Object.keys(weddingContext).length > 0) {
      let contextPrompt = '\n\nCurrent Wedding Context:\n';

      if (weddingContext.couple_names) {
        contextPrompt += `- Couple: ${weddingContext.couple_names}\n`;
      }
      if (weddingContext.wedding_date) {
        contextPrompt += `- Wedding Date: ${weddingContext.wedding_date}\n`;
      }
      if (weddingContext.venue_name) {
        contextPrompt += `- Venue: ${weddingContext.venue_name}\n`;
      }
      if (weddingContext.guest_count) {
        contextPrompt += `- Guest Count: ${weddingContext.guest_count}\n`;
      }
      if (weddingContext.budget_range) {
        contextPrompt += `- Budget: ${weddingContext.budget_range}\n`;
      }
      if (
        weddingContext.services_needed &&
        weddingContext.services_needed.length > 0
      ) {
        contextPrompt += `- Services Needed: ${weddingContext.services_needed.join(', ')}\n`;
      }

      return basePrompt + contextPrompt;
    }

    return basePrompt;
  }

  // ==========================================
  // Conversation Context Building
  // ==========================================

  private async buildConversationMessages(
    currentMessage: string,
    history: ChatbotMessage[],
    userContext: UserContext,
    weddingContext?: WeddingContext,
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: this.getSystemPrompt(userContext, weddingContext),
    });

    // Add conversation history (limit to last 10 messages to stay within token limits)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  // ==========================================
  // Context Enhancement
  // ==========================================

  private enhanceMessageWithContext(
    message: string,
    weddingContext?: WeddingContext,
  ): string {
    if (!weddingContext || Object.keys(weddingContext).length === 0) {
      return message;
    }

    // Add subtle context hints without being too verbose
    let enhancedMessage = message;

    // Add relevant context if the message relates to timing
    if (
      message.toLowerCase().includes('when') ||
      message.toLowerCase().includes('time')
    ) {
      if (weddingContext.wedding_date) {
        enhancedMessage += `\n\n(Note: Wedding date is ${weddingContext.wedding_date})`;
      }
    }

    // Add budget context for cost-related questions
    if (
      message.toLowerCase().includes('cost') ||
      message.toLowerCase().includes('price') ||
      message.toLowerCase().includes('budget')
    ) {
      if (weddingContext.budget_range) {
        enhancedMessage += `\n\n(Note: Wedding budget is ${weddingContext.budget_range})`;
      }
    }

    // Add venue context for location-related questions
    if (
      message.toLowerCase().includes('venue') ||
      message.toLowerCase().includes('location') ||
      message.toLowerCase().includes('where')
    ) {
      if (weddingContext.venue_name) {
        enhancedMessage += `\n\n(Note: Wedding venue is ${weddingContext.venue_name})`;
      }
    }

    return enhancedMessage;
  }

  // ==========================================
  // Fallback Response System
  // ==========================================

  private getFallbackResponse(
    message: string,
    responseTime: number,
  ): AIServiceResponse {
    const fallbackResponses = [
      "I apologize, but I'm experiencing some technical difficulties right now. Let me connect you with our wedding planning team who can assist you immediately.",
      "I'm currently unable to process your request, but I want to make sure you get the help you need. Would you like me to escalate this to one of our wedding coordinators?",
      "I'm having trouble accessing our wedding planning resources at the moment. In the meantime, you can reach our support team directly for immediate assistance.",
    ];

    // Simple keyword-based fallback responses
    let response = fallbackResponses[0];

    if (
      message.toLowerCase().includes('urgent') ||
      message.toLowerCase().includes('emergency')
    ) {
      response =
        'I understand this is urgent. Let me immediately connect you with our wedding coordination team for priority assistance.';
    } else if (
      message.toLowerCase().includes('wedding day') ||
      message.toLowerCase().includes('today')
    ) {
      response =
        'For wedding day support, please contact our emergency coordinator directly. This is our highest priority and requires immediate human assistance.';
    } else if (
      message.toLowerCase().includes('pricing') ||
      message.toLowerCase().includes('cost')
    ) {
      response =
        "For specific pricing information, I'd like to connect you with our wedding planning specialists who can provide detailed quotes based on your needs.";
    }

    return {
      content: response,
      tokens_used: 0,
      response_time_ms: responseTime,
      metadata: {
        model: 'fallback',
        temperature: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        finish_reason: 'fallback_used',
      },
    };
  }

  // ==========================================
  // Response Post-Processing
  // ==========================================

  private postProcessResponse(content: string): string {
    // Remove any potential harmful content
    let processedContent = content
      .replace(
        /(?:https?:\/\/)?(?:www\.)?(?!wedsync\.com)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
        '[external link removed]',
      )
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone number removed]')
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[email removed]',
      );

    // Ensure the response stays within reasonable length
    if (processedContent.length > 1000) {
      processedContent = processedContent.substring(0, 997) + '...';
    }

    return processedContent.trim();
  }

  // ==========================================
  // Token Cost Estimation
  // ==========================================

  estimateTokenCost(tokens: number): number {
    // GPT-4 pricing (approximate): $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
    // Using average of $0.045 per 1K tokens for estimation
    return (tokens / 1000) * 0.045;
  }

  // ==========================================
  // Health Check
  // ==========================================

  async healthCheck(): Promise<{
    status: string;
    model: string;
    timestamp: string;
  }> {
    try {
      const testCompletion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use cheaper model for health check
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10,
      });

      return {
        status: 'healthy',
        model: testCompletion.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return {
        status: 'unhealthy',
        model: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const chatbotAI = new ChatbotAIService();
