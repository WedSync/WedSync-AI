// ==========================================
// WS-243: Conversation Context Service
// ==========================================

import { chatbotDB } from '../database/chatbot-database-service';
import type {
  WeddingContext,
  UserContext,
  ChatbotPrompt,
} from '../../types/chatbot';

export class ConversationContextService {
  // ==========================================
  // Wedding Context Building
  // ==========================================

  async buildWeddingContext(
    organizationId: string,
    currentPage?: string,
    weddingId?: string,
    clientId?: string,
  ): Promise<WeddingContext> {
    try {
      const context = await chatbotDB.getWeddingContext(
        organizationId,
        weddingId,
        clientId,
      );

      // Enhance context based on current page
      if (currentPage) {
        context.current_page = currentPage;
        context.page_context = this.getPageContext(currentPage);
      }

      return context as WeddingContext;
    } catch (error) {
      console.error('Error building wedding context:', error);
      return {};
    }
  }

  // ==========================================
  // Page Context Enhancement
  // ==========================================

  private getPageContext(currentPage: string): Record<string, any> {
    const pageContextMap: Record<string, Record<string, any>> = {
      '/dashboard': {
        focus: 'overview',
        relevant_topics: [
          'upcoming tasks',
          'recent activity',
          'overall progress',
        ],
        suggested_actions: [
          'check timeline',
          'review vendor status',
          'update budget',
        ],
      },
      '/timeline': {
        focus: 'scheduling',
        relevant_topics: [
          'wedding day schedule',
          'vendor timing',
          'milestone dates',
        ],
        suggested_actions: [
          'add timeline item',
          'adjust timing',
          'coordinate with vendors',
        ],
      },
      '/budget': {
        focus: 'financial',
        relevant_topics: [
          'expense tracking',
          'vendor payments',
          'budget allocation',
        ],
        suggested_actions: [
          'add expense',
          'update budget category',
          'review spending',
        ],
      },
      '/vendors': {
        focus: 'vendor_management',
        relevant_topics: [
          'vendor communication',
          'contract status',
          'service details',
        ],
        suggested_actions: [
          'contact vendor',
          'update contract',
          'schedule meeting',
        ],
      },
      '/guests': {
        focus: 'guest_management',
        relevant_topics: ['guest list', 'RSVPs', 'seating arrangements'],
        suggested_actions: ['add guests', 'send invitations', 'track RSVPs'],
      },
      '/photos': {
        focus: 'photography',
        relevant_topics: [
          'photo gallery',
          'shot list',
          'photographer coordination',
        ],
        suggested_actions: [
          'view photos',
          'create shot list',
          'schedule session',
        ],
      },
    };

    return (
      pageContextMap[currentPage] || {
        focus: 'general',
        relevant_topics: [
          'wedding planning',
          'vendor coordination',
          'timeline management',
        ],
        suggested_actions: ['ask about wedding details', 'get planning advice'],
      }
    );
  }

  // ==========================================
  // User Context Enhancement
  // ==========================================

  async buildUserContext(
    userId: string,
    organizationId: string,
    userRole: string,
    sessionData?: Record<string, any>,
  ): Promise<UserContext> {
    return {
      user_id: userId,
      organization_id: organizationId,
      user_role: userRole,
      session_data: sessionData || {},
      current_page: sessionData?.current_page,
    };
  }

  // ==========================================
  // Dynamic Prompt Building
  // ==========================================

  async buildDynamicPrompt(
    organizationId: string,
    promptType: string,
    weddingContext: WeddingContext,
    userContext: UserContext,
  ): Promise<string> {
    try {
      // Get prompt template
      const promptTemplate = await chatbotDB.getPromptByType(
        organizationId,
        promptType,
      );

      if (!promptTemplate) {
        return this.getDefaultPrompt(promptType);
      }

      // Replace variables in prompt template
      let prompt = promptTemplate.content;

      // Replace wedding context variables
      if (weddingContext.couple_names) {
        prompt = prompt.replace(/{couple_names}/g, weddingContext.couple_names);
      }
      if (weddingContext.wedding_date) {
        prompt = prompt.replace(/{wedding_date}/g, weddingContext.wedding_date);
      }
      if (weddingContext.venue_name) {
        prompt = prompt.replace(/{venue_name}/g, weddingContext.venue_name);
      }
      if (weddingContext.budget_range) {
        prompt = prompt.replace(/{budget_range}/g, weddingContext.budget_range);
      }
      if (weddingContext.guest_count) {
        prompt = prompt.replace(
          /{guest_count}/g,
          weddingContext.guest_count.toString(),
        );
      }

      // Replace organization context variables
      const orgContext = await chatbotDB.getWeddingContext(organizationId);
      if (orgContext.organization_name) {
        prompt = prompt.replace(
          /{organization_name}/g,
          orgContext.organization_name,
        );
      }
      if (orgContext.service_types) {
        prompt = prompt.replace(
          /{service_types}/g,
          Array.isArray(orgContext.service_types)
            ? orgContext.service_types.join(', ')
            : orgContext.service_types,
        );
      }
      if (orgContext.service_list) {
        prompt = prompt.replace(
          /{service_list}/g,
          Array.isArray(orgContext.service_list)
            ? orgContext.service_list.join('\n- ')
            : orgContext.service_list,
        );
      }

      // Replace user context variables
      prompt = prompt.replace(/{user_role}/g, userContext.user_role);

      // Remove any unreplaced variables
      prompt = prompt.replace(/{[^}]*}/g, '[context not available]');

      return prompt;
    } catch (error) {
      console.error('Error building dynamic prompt:', error);
      return this.getDefaultPrompt(promptType);
    }
  }

  // ==========================================
  // Default Prompts
  // ==========================================

  private getDefaultPrompt(promptType: string): string {
    const defaultPrompts: Record<string, string> = {
      system: `You are a professional wedding planning assistant. You help couples and vendors coordinate their perfect wedding day. You have access to wedding details, vendor information, and can help with planning timelines, budget management, and vendor coordination.

Always be warm, professional, and detail-oriented. Ask clarifying questions when needed and provide specific, actionable advice.`,

      vendor_inquiry: `I can help you learn about our wedding services and answer questions about our packages, pricing, and availability. We specialize in creating memorable wedding experiences and would love to be part of your special day.

What specific information can I provide about our wedding services?`,

      timeline_assistance: `I'm here to help you create and manage your wedding timeline. I can assist with scheduling vendors, coordinating activities, and ensuring everything runs smoothly on your wedding day.

What aspects of your wedding timeline would you like to work on?`,

      budget_planning: `I can help you plan and track your wedding budget, including vendor costs, venue expenses, and other wedding-related spending. Let's make sure you stay on track financially while creating your dream wedding.

What budget questions can I help you with?`,

      guest_management: `I'm here to assist with guest list management, RSVP tracking, seating arrangements, and other guest-related planning. Let's make sure all your loved ones have a wonderful experience at your wedding.

How can I help with your guest planning?`,
    };

    return defaultPrompts[promptType] || defaultPrompts['system'];
  }

  // ==========================================
  // Context Validation
  // ==========================================

  validateContext(weddingContext: WeddingContext): {
    isValid: boolean;
    missingFields: string[];
    suggestions: string[];
  } {
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    // Check essential wedding information
    if (!weddingContext.couple_names) {
      missingFields.push('couple_names');
      suggestions.push("Ask for the couple's names to personalize responses");
    }

    if (!weddingContext.wedding_date) {
      missingFields.push('wedding_date');
      suggestions.push(
        'Ask for the wedding date to provide timeline-specific advice',
      );
    }

    if (!weddingContext.venue_name) {
      missingFields.push('venue_name');
      suggestions.push(
        'Ask about the wedding venue for location-specific recommendations',
      );
    }

    // Check if we have enough context for meaningful assistance
    const contextScore = Object.keys(weddingContext).length;
    const isValid = contextScore >= 2; // At least 2 pieces of context

    if (!isValid) {
      suggestions.push(
        'Gather more wedding details to provide better assistance',
      );
    }

    return {
      isValid,
      missingFields,
      suggestions,
    };
  }

  // ==========================================
  // Context Enrichment
  // ==========================================

  async enrichContextFromHistory(
    conversationId: string,
    organizationId: string,
    currentContext: WeddingContext,
  ): Promise<WeddingContext> {
    try {
      // Get recent messages to extract context
      const messagesResult = await chatbotDB.getMessages(
        conversationId,
        organizationId,
        { limit: 10 },
      );

      const enrichedContext = { ...currentContext };

      // Extract information from conversation history
      for (const message of messagesResult.messages) {
        if (message.role === 'user') {
          const content = message.content.toLowerCase();

          // Extract dates
          const dateMatch = content.match(
            /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4})\b/,
          );
          if (dateMatch && !enrichedContext.wedding_date) {
            enrichedContext.wedding_date = dateMatch[0];
          }

          // Extract names (simple pattern matching)
          const nameMatch = content.match(
            /\b(my|our) names? (?:are|is) ([a-zA-Z\s&]+)/i,
          );
          if (nameMatch && !enrichedContext.couple_names) {
            enrichedContext.couple_names = nameMatch[2];
          }

          // Extract venue information
          const venueMatch = content.match(
            /\b(?:venue|location) (?:is|at) ([a-zA-Z\s]+)/i,
          );
          if (venueMatch && !enrichedContext.venue_name) {
            enrichedContext.venue_name = venueMatch[1];
          }

          // Extract guest count
          const guestMatch = content.match(/\b(\d+) guests?\b/i);
          if (guestMatch && !enrichedContext.guest_count) {
            enrichedContext.guest_count = parseInt(guestMatch[1]);
          }

          // Extract budget information
          const budgetMatch = content.match(/budget (?:is|of) \$?([0-9,]+)/i);
          if (budgetMatch && !enrichedContext.budget_range) {
            enrichedContext.budget_range = `$${budgetMatch[1]}`;
          }
        }

        // Store extracted context in message wedding_context for future use
        if (
          message.wedding_context &&
          Object.keys(message.wedding_context).length === 0
        ) {
          await chatbotDB.updateMessageMetadata(message.id, {
            wedding_context: enrichedContext,
          });
        }
      }

      return enrichedContext;
    } catch (error) {
      console.error('Error enriching context from history:', error);
      return currentContext;
    }
  }

  // ==========================================
  // Context Suggestions
  // ==========================================

  generateContextQuestions(currentContext: WeddingContext): string[] {
    const questions: string[] = [];

    if (!currentContext.couple_names) {
      questions.push("What are the couple's names?");
    }

    if (!currentContext.wedding_date) {
      questions.push('When is the wedding date?');
    }

    if (!currentContext.venue_name) {
      questions.push('Where will the wedding take place?');
    }

    if (!currentContext.guest_count) {
      questions.push('How many guests are you expecting?');
    }

    if (!currentContext.budget_range) {
      questions.push("What's your wedding budget range?");
    }

    if (
      !currentContext.services_needed ||
      currentContext.services_needed.length === 0
    ) {
      questions.push('What wedding services are you looking for?');
    }

    return questions.slice(0, 3); // Limit to 3 questions to avoid overwhelming
  }

  // ==========================================
  // Context Persistence
  // ==========================================

  async saveContextToConversation(
    conversationId: string,
    organizationId: string,
    context: WeddingContext,
  ): Promise<void> {
    try {
      await chatbotDB.updateConversation(conversationId, organizationId, {
        context_data: {
          ...context,
          last_updated: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error) {
      console.error('Error saving context to conversation:', error);
    }
  }
}

// Export singleton instance
export const conversationContext = new ConversationContextService();
