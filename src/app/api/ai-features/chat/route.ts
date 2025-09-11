// WS-243: AI Chatbot Integration System
// Real-time chat endpoint for frontend chatbot widget integration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ChatbotMessage } from '@/types/chatbot';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { message, conversationId, context } = body;

    // Validate required fields
    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, conversationId' },
        { status: 400 },
      );
    }

    // Create the user message record
    const userMessage: Partial<ChatbotMessage> = {
      conversation_id: conversationId,
      role: 'user',
      content: message,
      ai_metadata: {},
      tokens_used: 0,
      response_time_ms: 0,
      wedding_context: context?.weddingContext || {},
      is_edited: false,
      is_flagged: false,
    };

    // Store the user message
    const { data: savedUserMessage, error: userMessageError } = await supabase
      .from('chatbot_messages')
      .insert(userMessage)
      .select()
      .single();

    if (userMessageError) {
      console.error('Failed to save user message:', userMessageError);
    }

    // Forward to the main chatbot API for processing
    const chatbotApiUrl = new URL('/api/chatbot', request.url);
    const chatbotResponse = await fetch(chatbotApiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        message,
        session_id: conversationId,
        user_id: user.id,
        context: context || {},
      }),
    });

    if (!chatbotResponse.ok) {
      throw new Error(`Chatbot API error: ${chatbotResponse.status}`);
    }

    const botResponse = await chatbotResponse.json();
    const startTime = Date.now();

    // Create the assistant message record
    const assistantMessage: Partial<ChatbotMessage> = {
      conversation_id: conversationId,
      role: 'assistant',
      content:
        botResponse.message ||
        'I apologize, but I encountered an issue processing your request.',
      ai_metadata: {
        intent: botResponse.intent,
        confidence: botResponse.confidence,
        suggestions: botResponse.suggestions,
        quick_replies: botResponse.quick_replies,
        escalation_available: botResponse.escalation_available,
      },
      tokens_used: estimateTokens(botResponse.message || ''),
      response_time_ms: Date.now() - startTime,
      wedding_context: context?.weddingContext || {},
      is_edited: false,
      is_flagged: false,
    };

    // Store the assistant message
    const { data: savedAssistantMessage, error: assistantMessageError } =
      await supabase
        .from('chatbot_messages')
        .insert(assistantMessage)
        .select()
        .single();

    if (assistantMessageError) {
      console.error('Failed to save assistant message:', assistantMessageError);
    }

    // Return the response in the format expected by the frontend
    return NextResponse.json({
      success: true,
      userMessage: savedUserMessage,
      assistantMessage: savedAssistantMessage,
      botResponse: {
        message: botResponse.message,
        intent: botResponse.intent,
        confidence: botResponse.confidence,
        suggestions: botResponse.suggestions,
        quick_replies: botResponse.quick_replies,
        escalation_available: botResponse.escalation_available,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        message:
          'I apologize, but I encountered a technical issue. Please try again in a moment.',
      },
      { status: 500 },
    );
  }
}

// Utility function to estimate token count (simple approximation)
function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}
