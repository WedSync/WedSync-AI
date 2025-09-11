// ==========================================
// WS-243: AI Chatbot - Messages API
// GET /api/chatbot/conversations/[id]/messages - Get message history
// POST /api/chatbot/conversations/[id]/messages - Send message to AI
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  checkRateLimit,
  createAuthErrorResponse,
  createRateLimitResponse,
  createNotFoundResponse,
  canAccessChatbot,
} from '@/lib/auth/chatbot-auth';
import { chatbotDB } from '@/lib/database/chatbot-database-service';
import {
  validateAndSanitize,
  CreateMessageSchema,
  MessageQuerySchema,
  UUIDSchema,
  validateContentSecurity,
} from '@/lib/validation/chatbot-schemas';

// ==========================================
// GET - Get message history
// ==========================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Authentication
    const user = await getAuthenticatedUser();
    if (!user || !canAccessChatbot(user)) {
      return createAuthErrorResponse(
        'Access denied. Chatbot feature required.',
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(`messages:get:${user.id}`, 30, 60000);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    // Validate conversation ID
    const conversationId = validateAndSanitize(UUIDSchema, params.id);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      role: searchParams.get('role') || undefined,
      since: searchParams.get('since') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Validate query parameters
    const validatedQuery = validateAndSanitize(MessageQuerySchema, queryData);

    // Fetch messages
    const result = await chatbotDB.getMessages(
      conversationId,
      user.organization_id,
      validatedQuery,
    );

    return NextResponse.json({
      success: true,
      data: {
        messages: result.messages,
        pagination: {
          total: result.total,
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          pages: Math.ceil(result.total / validatedQuery.limit),
        },
      },
      meta: {
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
        rate_limit: {
          remaining: rateLimit.remaining,
          reset_time: rateLimit.resetTime,
        },
      },
    });
  } catch (error) {
    console.error(
      `GET /api/chatbot/conversations/${params.id}/messages error:`,
      error,
    );

    if (error.message.includes('Conversation not found')) {
      return createNotFoundResponse('Conversation not found or access denied');
    }

    if (error.message.includes('Invalid UUID')) {
      return NextResponse.json(
        {
          error: 'Invalid conversation ID',
          code: 'INVALID_ID',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        code: 'FETCH_FAILED',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// ==========================================
// POST - Send message and get AI response
// ==========================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const startTime = Date.now();

  try {
    // Authentication
    const user = await getAuthenticatedUser();
    if (!user || !canAccessChatbot(user)) {
      return createAuthErrorResponse(
        'Access denied. Chatbot feature required.',
      );
    }

    // Rate limiting - stricter for AI requests
    const rateLimit = checkRateLimit(`messages:create:${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    // Validate conversation ID
    const conversationId = validateAndSanitize(UUIDSchema, params.id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateAndSanitize(CreateMessageSchema, body);

    // Content security validation
    const contentSecurity = validateContentSecurity(validatedData.content);
    if (!contentSecurity.isValid) {
      return NextResponse.json(
        {
          error: 'Content validation failed',
          code: 'CONTENT_SECURITY_FAILED',
          details: contentSecurity.issues,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Verify conversation exists and user has access
    const conversation = await chatbotDB.getConversation(
      conversationId,
      user.organization_id,
    );

    if (!conversation) {
      return createNotFoundResponse('Conversation not found or access denied');
    }

    // Check if conversation is active
    if (
      conversation.status === 'archived' ||
      conversation.status === 'closed'
    ) {
      return NextResponse.json(
        {
          error: 'Cannot send messages to inactive conversation',
          code: 'CONVERSATION_INACTIVE',
          details: `Conversation status: ${conversation.status}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Create user message
    const userMessage = await chatbotDB.createMessage(conversationId, {
      content: contentSecurity.cleanContent,
      role: 'user',
      wedding_context: validatedData.wedding_context,
    });

    // Get conversation history for AI context
    const messagesResult = await chatbotDB.getMessages(
      conversationId,
      user.organization_id,
      { limit: 20 }, // Last 20 messages for context
    );

    // Get wedding context for AI
    const weddingContext = await chatbotDB.getWeddingContext(
      user.organization_id,
      conversation.wedding_id || undefined,
      conversation.client_id || undefined,
    );

    // Prepare AI request (this will be implemented in the next step)
    const aiRequestData = {
      message: contentSecurity.cleanContent,
      conversation_history: messagesResult.messages,
      user_context: {
        user_id: user.id,
        organization_id: user.organization_id,
        user_role: user.role,
      },
      wedding_context: weddingContext,
    };

    // For now, create a placeholder AI response
    // TODO: Replace with actual OpenAI service call
    const placeholderAIResponse = {
      content:
        "Thank you for your message! I'm here to help with your wedding planning. Our AI service is being configured and will be available soon to provide personalized assistance based on your wedding details and vendor requirements.",
      tokens_used: 50,
      response_time_ms: Date.now() - startTime,
      metadata: {
        model: 'placeholder',
        temperature: 0.7,
        prompt_tokens: 0,
        completion_tokens: 50,
        finish_reason: 'placeholder',
      },
    };

    // Create AI response message
    const aiMessage = await chatbotDB.createMessage(conversationId, {
      content: placeholderAIResponse.content,
      role: 'assistant',
      wedding_context: weddingContext,
    });

    // Update AI message with metadata
    await chatbotDB.updateMessageMetadata(aiMessage.id, {
      ai_metadata: placeholderAIResponse.metadata,
      tokens_used: placeholderAIResponse.tokens_used,
      response_time_ms: placeholderAIResponse.response_time_ms,
    });

    // Update conversation analytics
    await chatbotDB.updateConversationAnalytics(conversationId, {
      avg_response_time_ms: placeholderAIResponse.response_time_ms,
      message_count: (conversation.total_messages || 0) + 2, // User + AI message
      total_tokens_cost: placeholderAIResponse.tokens_used * 0.0001, // Rough estimate
    });

    // Log message exchange
    console.log(
      `Message exchange in conversation ${conversationId}: user ${user.id} -> AI (${placeholderAIResponse.tokens_used} tokens, ${placeholderAIResponse.response_time_ms}ms)`,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          user_message: userMessage,
          ai_message: {
            ...aiMessage,
            ai_metadata: placeholderAIResponse.metadata,
            tokens_used: placeholderAIResponse.tokens_used,
            response_time_ms: placeholderAIResponse.response_time_ms,
          },
          conversation_updated: {
            total_messages: conversation.total_messages + 2,
            last_activity_at: new Date().toISOString(),
          },
        },
        meta: {
          conversation_id: conversationId,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          rate_limit: {
            remaining: rateLimit.remaining,
            reset_time: rateLimit.resetTime,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      `POST /api/chatbot/conversations/${params.id}/messages error:`,
      error,
    );

    // Handle validation errors
    if (error.message.includes('Validation failed')) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    if (error.message.includes('Conversation not found')) {
      return createNotFoundResponse('Conversation not found or access denied');
    }

    if (error.message.includes('Invalid UUID')) {
      return NextResponse.json(
        {
          error: 'Invalid conversation ID',
          code: 'INVALID_ID',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send message',
        code: 'MESSAGE_FAILED',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// ==========================================
// OPTIONS - CORS preflight
// ==========================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
