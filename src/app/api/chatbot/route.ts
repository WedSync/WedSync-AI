// WS-126: AI-Powered Support Chatbot System
// Intelligent chatbot with intent recognition, knowledge retrieval, and natural conversation flow

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ChatbotRequest,
  ChatbotResponse,
  Intent,
  KnowledgeResult,
} from '@/types/chatbot';
import { UsageTrackingService } from '@/lib/billing/usage-tracking-service';

export const dynamic = 'force-dynamic';

// POST /api/chatbot - Process chatbot messages with AI-powered responses
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication (optional for public chatbot)
    const { data: user } = await supabase.auth.getUser();

    const body: ChatbotRequest = await request.json();

    // Validate required fields
    if (!body.message || !body.session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message, session_id' },
        { status: 400 },
      );
    }

    // Initialize usage tracking service
    const usageTracking = new UsageTrackingService();

    // Get user subscription info for usage tracking
    let subscriptionId: string | undefined;
    let organizationId: string | undefined;

    if (user) {
      try {
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('id, organization_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        subscriptionId = subscription?.id;
        organizationId = subscription?.organization_id;
      } catch (error) {
        console.log('No active subscription found for chatbot usage tracking');
      }
    }

    // Get or create conversation context
    const context = await getOrCreateContext(
      supabase,
      body.session_id,
      user?.id,
    );

    // Track chatbot interaction usage
    if (subscriptionId && organizationId) {
      await usageTracking.recordUsage(
        subscriptionId,
        organizationId,
        'ai_chatbot_interactions',
        1,
        {
          session_id: body.session_id,
          message_length: body.message.length,
          feature: 'ai_chatbot_conversation',
        },
      );
    }

    // Recognize intent from user message
    const intent = await recognizeIntent(body.message, context);

    // Retrieve relevant knowledge based on intent
    const knowledgeResults = await retrieveKnowledge(
      supabase,
      intent,
      body.message,
      user?.id,
    );

    // Generate conversational response
    const response = await generateResponse(
      intent,
      knowledgeResults,
      body.message,
      context,
    );

    // Update conversation context
    await updateContext(supabase, body.session_id, {
      last_intent: intent.name,
      last_confidence: intent.confidence,
      conversation_turn: context.conversation_turn + 1,
      last_message_at: new Date().toISOString(),
    });

    // Log interaction for analytics
    await logChatbotInteraction(supabase, {
      session_id: body.session_id,
      user_id: user?.id,
      user_message: body.message,
      detected_intent: intent.name,
      intent_confidence: intent.confidence,
      response_type: response.type,
      knowledge_sources: knowledgeResults.map((r) => r.source),
      response_time_ms: Date.now() - new Date(context.updated_at).getTime(),
    });

    const chatbotResponse: ChatbotResponse = {
      message: response.message,
      type: response.type,
      intent: intent.name,
      confidence: intent.confidence,
      suggestions: response.suggestions,
      quick_replies: response.quick_replies,
      escalation_available: response.escalation_available,
      session_id: body.session_id,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(chatbotResponse, { status: 200 });
  } catch (error) {
    console.error('Chatbot API error:', error);

    // Return fallback response
    return NextResponse.json(
      {
        message:
          "I apologize, but I'm experiencing some technical difficulties. Would you like me to connect you with a human support agent?",
        type: 'error',
        intent: 'technical_error',
        confidence: 1.0,
        escalation_available: true,
        session_id: request.body?.session_id || 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// GET /api/chatbot - Get chatbot status and capabilities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'capabilities':
        return NextResponse.json({
          intents: [
            'greeting',
            'pricing_inquiry',
            'booking_question',
            'vendor_search',
            'wedding_planning',
            'technical_support',
            'general_question',
            'goodbye',
          ],
          features: [
            'intent_recognition',
            'knowledge_retrieval',
            'conversation_memory',
            'human_escalation',
            'multi_language_support',
          ],
          knowledge_sources: [
            'faq_database',
            'vendor_profiles',
            'pricing_information',
            'booking_policies',
          ],
        });

      case 'health':
        return NextResponse.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });

      default:
        return NextResponse.json({
          message:
            'WedSync AI Assistant is ready to help you with your wedding planning questions!',
          available_actions: ['capabilities', 'health'],
        });
    }
  } catch (error) {
    console.error('Chatbot GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper Functions

async function getOrCreateContext(
  supabase: any,
  sessionId: string,
  userId?: string,
) {
  try {
    // Try to get existing context
    const { data: context } = await supabase
      .from('chatbot_contexts')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (context) {
      return context;
    }

    // Create new context
    const { data: newContext, error } = await supabase
      .from('chatbot_contexts')
      .insert({
        session_id: sessionId,
        user_id: userId,
        conversation_turn: 0,
        context_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return newContext;
  } catch (error) {
    console.error('Context management error:', error);
    // Return minimal context on error
    return {
      session_id: sessionId,
      user_id: userId,
      conversation_turn: 0,
      context_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

async function recognizeIntent(message: string, context: any): Promise<Intent> {
  const lowercaseMessage = message.toLowerCase().trim();

  // Define intent patterns (simple rule-based system)
  const intentPatterns = {
    greeting:
      /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/,
    goodbye: /^(bye|goodbye|see you|farewell|thanks|thank you)/,
    pricing_inquiry:
      /(price|cost|pricing|how much|budget|expensive|cheap|rate|fee)/,
    booking_question:
      /(book|booking|reserve|reservation|appointment|schedule|availability)/,
    vendor_search:
      /(find|search|looking for|need|vendor|supplier|photographer|caterer|venue)/,
    wedding_planning:
      /(wedding|plan|planning|timeline|checklist|preparation|organize)/,
    technical_support:
      /(help|support|problem|issue|error|bug|not working|broken)/,
    general_question: /(what|how|when|where|why|can you|could you|would you)/,
  };

  let bestMatch = { name: 'general_question', confidence: 0.5 };

  // Check patterns and calculate confidence
  for (const [intentName, pattern] of Object.entries(intentPatterns)) {
    if (pattern.test(lowercaseMessage)) {
      const confidence = calculateConfidence(lowercaseMessage, pattern);
      if (confidence > bestMatch.confidence) {
        bestMatch = { name: intentName, confidence };
      }
    }
  }

  // Context-aware intent adjustment
  if (
    context.last_intent === 'pricing_inquiry' &&
    lowercaseMessage.includes('more')
  ) {
    bestMatch = { name: 'pricing_inquiry', confidence: 0.9 };
  }

  return bestMatch;
}

function calculateConfidence(message: string, pattern: RegExp): number {
  const matches = message.match(pattern);
  if (!matches) return 0;

  // Basic confidence calculation based on match length and message length
  const matchLength = matches[0].length;
  const messageLength = message.length;
  return Math.min(0.95, 0.7 + (matchLength / messageLength) * 0.25);
}

async function retrieveKnowledge(
  supabase: any,
  intent: Intent,
  message: string,
  userId?: string,
): Promise<KnowledgeResult[]> {
  const results: KnowledgeResult[] = [];

  try {
    // Search FAQ database
    const faqResults = await searchFAQKnowledge(supabase, message, userId);
    results.push(...faqResults);

    // Get intent-specific knowledge
    const intentResults = await getIntentSpecificKnowledge(
      supabase,
      intent,
      message,
    );
    results.push(...intentResults);

    // Sort by relevance score
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    return results.slice(0, 5); // Return top 5 most relevant results
  } catch (error) {
    console.error('Knowledge retrieval error:', error);
    return [];
  }
}

async function searchFAQKnowledge(
  supabase: any,
  query: string,
  userId?: string,
): Promise<KnowledgeResult[]> {
  try {
    // Use the existing FAQ search functionality
    const { data: faqResults } = await supabase.rpc('search_faqs_public', {
      p_query: query,
      p_limit: 3,
    });

    return (faqResults || []).map((faq: any) => ({
      id: faq.id,
      title: faq.question,
      content: faq.answer,
      source: 'faq',
      relevance_score: faq.relevance_score || 0.8,
      metadata: {
        category: faq.category_name,
        tags: faq.tags,
      },
    }));
  } catch (error) {
    console.error('FAQ search error:', error);
    return [];
  }
}

async function getIntentSpecificKnowledge(
  supabase: any,
  intent: Intent,
  message: string,
): Promise<KnowledgeResult[]> {
  const results: KnowledgeResult[] = [];

  try {
    switch (intent.name) {
      case 'pricing_inquiry':
        // Get pricing information
        const { data: pricingInfo } = await supabase
          .from('vendor_categories')
          .select('name, typical_price_range, description')
          .limit(3);

        if (pricingInfo) {
          results.push(
            ...pricingInfo.map((category: any) => ({
              id: `pricing_${category.name}`,
              title: `${category.name} Pricing`,
              content: `Typical price range: ${category.typical_price_range}. ${category.description}`,
              source: 'pricing_database',
              relevance_score: 0.85,
              metadata: { category: category.name },
            })),
          );
        }
        break;

      case 'vendor_search':
        // Get vendor information
        const { data: vendors } = await supabase
          .from('suppliers')
          .select('business_name, primary_category, description')
          .eq('is_active', true)
          .limit(3);

        if (vendors) {
          results.push(
            ...vendors.map((vendor: any) => ({
              id: `vendor_${vendor.business_name}`,
              title: vendor.business_name,
              content: `${vendor.primary_category}: ${vendor.description}`,
              source: 'vendor_directory',
              relevance_score: 0.8,
              metadata: { category: vendor.primary_category },
            })),
          );
        }
        break;
    }
  } catch (error) {
    console.error('Intent-specific knowledge error:', error);
  }

  return results;
}

async function generateResponse(
  intent: Intent,
  knowledgeResults: KnowledgeResult[],
  message: string,
  context: any,
) {
  const response = {
    message: '',
    type: 'text' as 'text' | 'rich' | 'error' | 'escalation',
    suggestions: [] as string[],
    quick_replies: [] as string[],
    escalation_available: false,
  };

  // Generate response based on intent and knowledge
  switch (intent.name) {
    case 'greeting':
      response.message =
        "Hello! I'm the WedSync AI Assistant. I'm here to help you with your wedding planning questions. How can I assist you today?";
      response.quick_replies = [
        'Find vendors',
        'Check pricing',
        'Wedding planning tips',
        'Book consultation',
      ];
      break;

    case 'pricing_inquiry':
      if (knowledgeResults.length > 0) {
        const pricingInfo = knowledgeResults
          .filter(
            (r) =>
              r.source === 'pricing_database' || r.content.includes('price'),
          )
          .slice(0, 2);

        if (pricingInfo.length > 0) {
          response.message =
            "Here's what I found about pricing:\n\n" +
            pricingInfo
              .map((info) => `• ${info.title}: ${info.content}`)
              .join('\n') +
            '\n\nWould you like more specific information about any particular service?';
        } else {
          response.message =
            "I'd be happy to help you with pricing information. Could you specify which wedding service you're interested in? For example: photography, catering, venue, etc.";
        }
      }
      response.quick_replies = [
        'Photography pricing',
        'Venue costs',
        'Catering rates',
        'Get detailed quote',
      ];
      break;

    case 'vendor_search':
      response.message =
        'I can help you find the perfect vendors for your wedding! ';
      if (knowledgeResults.length > 0) {
        response.message +=
          'Here are some options:\n\n' +
          knowledgeResults
            .slice(0, 3)
            .map((vendor) => `• ${vendor.title}: ${vendor.content}`)
            .join('\n');
      }
      response.message +=
        '\n\nWhat type of vendor are you looking for specifically?';
      response.quick_replies = [
        'Photographers',
        'Venues',
        'Caterers',
        'View all vendors',
      ];
      break;

    case 'wedding_planning':
      if (knowledgeResults.length > 0) {
        const planningTips = knowledgeResults
          .filter((r) => r.source === 'faq')
          .slice(0, 2);
        response.message =
          'Here are some wedding planning insights:\n\n' +
          planningTips.map((tip) => `• ${tip.content}`).join('\n');
      } else {
        response.message =
          "I'm here to help with your wedding planning! Whether you need timeline guidance, vendor recommendations, or budget planning - I've got you covered.";
      }
      response.quick_replies = [
        'Create timeline',
        'Budget planning',
        'Vendor checklist',
        'Planning tips',
      ];
      break;

    case 'technical_support':
      response.message =
        "I understand you're experiencing a technical issue. I'd be happy to help or connect you with our support team.";
      response.type = 'escalation';
      response.escalation_available = true;
      response.quick_replies = [
        'Common issues',
        'Contact support',
        'Report a bug',
        'Account help',
      ];
      break;

    case 'goodbye':
      response.message =
        'Thank you for using WedSync! I hope I was able to help with your wedding planning. Have a wonderful day, and congratulations on your upcoming wedding! 💐';
      break;

    default:
      if (knowledgeResults.length > 0) {
        const topResult = knowledgeResults[0];
        response.message = `Based on your question, here's what I found:\n\n${topResult.content}\n\nWould you like more information about this topic?`;
        response.suggestions = knowledgeResults.slice(1, 3).map((r) => r.title);
      } else {
        response.message =
          'I understand you have a question about wedding planning. While I search for the best answer, would you like me to connect you with one of our human specialists who can provide personalized assistance?';
        response.escalation_available = true;
      }
      response.quick_replies = [
        'Yes, help me more',
        'Connect with specialist',
        'Ask something else',
        'Browse services',
      ];
  }

  // Add escalation option for low confidence responses
  if (intent.confidence < 0.6) {
    response.escalation_available = true;
  }

  return response;
}

async function updateContext(supabase: any, sessionId: string, updates: any) {
  try {
    await supabase
      .from('chatbot_contexts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);
  } catch (error) {
    console.error('Context update error:', error);
  }
}

async function logChatbotInteraction(supabase: any, interaction: any) {
  try {
    await supabase.from('chatbot_analytics').insert({
      ...interaction,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics logging error:', error);
  }
}
