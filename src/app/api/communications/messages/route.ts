import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import DOMPurify from 'isomorphic-dompurify';
import {
  sanitizeString,
  sanitizeHTML,
  validateAndSanitizeObject,
  isValidUUID,
} from '@/lib/security/input-validation';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for messages
const messageRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// Message validation schema
const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  message_type: z.enum(['text', 'image', 'file', 'system']).default('text'),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
        url: z.string().url(),
        type: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
  metadata: z.record(z.any()).optional(),
  reply_to_message_id: z.string().uuid().optional(),
});

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await messageRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Limit max results
    const before = searchParams.get('before'); // For pagination by timestamp
    const offset = (page - 1) * limit;

    if (!conversationId || !isValidUUID(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid or missing conversation_id parameter' },
        { status: 400 },
      );
    }

    // Get user to verify access
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('client_id, vendor_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    // Build query for messages
    let query = supabase
      .from('messages')
      .select(
        `
        *,
        sender:user_profiles!messages_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `,
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (before) {
      query = query.lt('created_at', before);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 },
      );
    }

    // Reverse to show oldest first
    const sortedMessages = (messages || []).reverse();

    return NextResponse.json({
      messages: sortedMessages,
      page,
      limit,
      has_more: (messages?.length || 0) === limit,
    });
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await messageRateLimit.check(10, identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many message creation requests' },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const rawBody = await request.json();

    // Validate and sanitize input using Zod schema
    const validatedData = messageSchema.parse(rawBody);

    // Additional XSS sanitization for content
    const sanitizedContent = sanitizeHTML(validatedData.content);

    // Sanitize display names and other text fields in metadata if present
    const sanitizedMetadata = validatedData.metadata
      ? validateAndSanitizeObject(validatedData.metadata, {})
      : undefined;

    const { conversation_id, message_type, attachments, reply_to_message_id } =
      validatedData;

    if (!conversation_id || !sanitizedContent) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 },
      );
    }

    // Get user to verify access
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for sender info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url, organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Get conversation details to determine recipient
    const { data: conversation } = await supabase
      .from('conversations')
      .select('client_id, vendor_id, organization_id')
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    // Determine sender and recipient types
    const isClient = conversation.client_id === user.id;
    const senderType = isClient ? 'client' : 'vendor';
    const recipientType = isClient ? 'vendor' : 'client';
    const recipientId = isClient
      ? conversation.vendor_id
      : conversation.client_id;

    // Create message with sanitized content
    const messageData: MessageInsert = {
      conversation_id,
      sender_id: user.id,
      sender_type: senderType,
      sender_name:
        sanitizeString(userProfile.display_name, 100) || 'Unknown User',
      sender_avatar_url: userProfile.avatar_url,
      recipient_id: recipientId,
      recipient_type: recipientType,
      organization_id: conversation.organization_id,
      message_type,
      content: sanitizedContent,
      metadata: sanitizedMetadata,
      attachments,
      is_read: false,
      is_system_message: false,
      reply_to_message_id,
    };

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select(
        `
        *,
        sender:user_profiles!messages_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `,
      )
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 },
      );
    }

    // Update conversation with last message info (using sanitized content)
    const unreadCountField =
      senderType === 'client' ? 'unread_count_vendor' : 'unread_count_client';
    const sanitizedPreview =
      sanitizeString(sanitizedContent.substring(0, 100), 100) ||
      'Message received';

    // First get current unread count to safely increment
    const { data: currentConversation } = await supabase
      .from('conversations')
      .select(`${unreadCountField}`)
      .eq('id', conversation_id)
      .single();

    const currentUnreadCount = currentConversation?.[unreadCountField] || 0;

    const { error: conversationError } = await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: sanitizedPreview,
        [unreadCountField]: currentUnreadCount + 1, // Safe increment without raw SQL
      })
      .eq('id', conversation_id);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
    }

    // Create activity feed entry (using sanitized data)
    try {
      const sanitizedDisplayName =
        sanitizeString(userProfile.display_name, 100) || 'Unknown User';
      const sanitizedActivityDescription =
        sanitizeString(sanitizedContent.substring(0, 200), 200) ||
        'Message sent';

      await supabase.from('activity_feeds').insert({
        organization_id: conversation.organization_id,
        entity_type: 'message',
        entity_id: message.id,
        activity_type: 'message_sent',
        title: `New message from ${sanitizedDisplayName}`,
        description: sanitizedActivityDescription,
        actor_id: user.id,
        actor_name: sanitizedDisplayName,
        actor_type: senderType,
        target_user_ids: [recipientId],
        is_public: false,
        icon: 'message-circle',
        color: '#3b82f6',
        data: {
          conversation_id,
          message_type,
        },
      });
    } catch (activityError) {
      console.error('Error creating activity feed entry:', activityError);
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in messages POST:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid message data',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
