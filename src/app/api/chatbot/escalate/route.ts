// WS-126: Chatbot Human Escalation Handler
// Handles escalation from chatbot to human support agents

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EscalationRequest, HumanAgent } from '@/types/chatbot';

export const dynamic = 'force-dynamic';

// POST /api/chatbot/escalate - Escalate conversation to human support
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { session_id, reason, priority = 'normal', context } = body;

    if (!session_id || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, reason' },
        { status: 400 },
      );
    }

    // Get conversation context and history
    const conversationContext = await getConversationContext(
      supabase,
      session_id,
    );

    // Find available human agent
    const availableAgent = await findAvailableAgent(supabase, reason, priority);

    // Create escalation request
    const escalationRequest: EscalationRequest = {
      session_id,
      user_id: user?.id,
      reason,
      priority,
      context: conversationContext,
      conversation_history: await getConversationHistory(supabase, session_id),
      requested_at: new Date().toISOString(),
      metadata: {
        user_agent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        ...context,
      },
    };

    // Store escalation request
    const { data: escalation, error: escalationError } = await supabase
      .from('chatbot_escalations')
      .insert({
        session_id: escalationRequest.session_id,
        user_id: escalationRequest.user_id,
        reason: escalationRequest.reason,
        priority: escalationRequest.priority,
        conversation_context: escalationRequest.context,
        conversation_history: escalationRequest.conversation_history,
        assigned_agent_id: availableAgent?.id,
        status: availableAgent ? 'assigned' : 'pending',
        requested_at: escalationRequest.requested_at,
        metadata: escalationRequest.metadata,
      })
      .select()
      .single();

    if (escalationError) {
      console.error('Escalation creation error:', escalationError);
      throw escalationError;
    }

    // Update chatbot context to mark as escalated
    await supabase
      .from('chatbot_contexts')
      .update({
        escalated: true,
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
        assigned_agent_id: availableAgent?.id,
      })
      .eq('session_id', session_id);

    // Create chat room for human agent conversation
    let chatRoom = null;
    if (availableAgent) {
      chatRoom = await createHumanSupportChatRoom(supabase, {
        escalation_id: escalation.id,
        user_id: user?.id,
        agent_id: availableAgent.id,
        session_id,
      });

      // Notify the agent
      await notifyAgent(supabase, availableAgent.id, escalation);
    }

    // Send notification email if configured
    await sendEscalationNotification(escalationRequest, availableAgent);

    const response = {
      escalation_id: escalation.id,
      status: escalation.status,
      agent: availableAgent
        ? {
            id: availableAgent.id,
            name: availableAgent.name,
            specialties: availableAgent.specialties,
            average_response_time: availableAgent.average_response_time,
          }
        : null,
      chat_room_id: chatRoom?.id,
      estimated_wait_time: availableAgent
        ? availableAgent.average_response_time
        : await getEstimatedWaitTime(supabase, priority),
      message: availableAgent
        ? `Great! I'm connecting you with ${availableAgent.name}, one of our specialists. They'll be with you shortly.`
        : "I'm adding you to our support queue. One of our specialists will be with you as soon as possible. You can continue the conversation here or check back later.",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Escalation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to escalate to human support',
        message:
          'We apologize for the inconvenience. Please try contacting support directly.',
        fallback_contact: {
          email: 'support@wedsync.com',
          phone: '1-800-WEDSYNC',
        },
      },
      { status: 500 },
    );
  }
}

// GET /api/chatbot/escalate - Get escalation status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');
    const escalation_id = searchParams.get('escalation_id');

    if (!session_id && !escalation_id) {
      return NextResponse.json(
        { error: 'Missing session_id or escalation_id parameter' },
        { status: 400 },
      );
    }

    let query = supabase.from('chatbot_escalations').select(`
        *,
        agent:assigned_agent_id(
          id, name, specialties, average_response_time, satisfaction_rating
        )
      `);

    if (escalation_id) {
      query = query.eq('id', escalation_id);
    } else {
      query = query.eq('session_id', session_id);
    }

    const { data: escalation, error } = await query.single();

    if (error) {
      return NextResponse.json(
        { error: 'Escalation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      escalation_id: escalation.id,
      status: escalation.status,
      created_at: escalation.requested_at,
      resolved_at: escalation.resolved_at,
      agent: escalation.agent,
      estimated_wait_time: escalation.estimated_wait_time,
      chat_room_id: escalation.chat_room_id,
    });
  } catch (error) {
    console.error('Get escalation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper Functions

async function getConversationContext(supabase: any, sessionId: string) {
  try {
    const { data: context } = await supabase
      .from('chatbot_contexts')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    return context || {};
  } catch (error) {
    console.error('Get context error:', error);
    return {};
  }
}

async function getConversationHistory(supabase: any, sessionId: string) {
  try {
    const { data: analytics } = await supabase
      .from('chatbot_analytics')
      .select('user_message, detected_intent, intent_confidence, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    return (
      analytics?.map((entry: any) => ({
        user_message: entry.user_message,
        intent: entry.detected_intent,
        confidence: entry.intent_confidence,
        timestamp: entry.created_at,
      })) || []
    );
  } catch (error) {
    console.error('Get history error:', error);
    return [];
  }
}

async function findAvailableAgent(
  supabase: any,
  reason: string,
  priority: string,
): Promise<HumanAgent | null> {
  try {
    // Get agent specialties based on escalation reason
    const requiredSpecialties = getRequiredSpecialties(reason);

    let query = supabase
      .from('support_agents')
      .select(
        `
        id, name, specialties, availability_status,
        current_chats, max_concurrent_chats,
        average_response_time, satisfaction_rating
      `,
      )
      .eq('availability_status', 'available')
      .lt('current_chats', supabase.raw('max_concurrent_chats'));

    // Filter by specialties if needed
    if (requiredSpecialties.length > 0) {
      query = query.overlaps('specialties', requiredSpecialties);
    }

    // Order by priority factors
    if (priority === 'urgent') {
      query = query.order('average_response_time', { ascending: true });
    } else {
      query = query
        .order('satisfaction_rating', { ascending: false })
        .order('current_chats', { ascending: true });
    }

    const { data: agents } = await query.limit(5);

    if (!agents || agents.length === 0) {
      return null;
    }

    // Select the best available agent
    return agents[0] as HumanAgent;
  } catch (error) {
    console.error('Find agent error:', error);
    return null;
  }
}

function getRequiredSpecialties(reason: string): string[] {
  const specialtyMap: Record<string, string[]> = {
    pricing_inquiry: ['pricing', 'sales'],
    technical_support: ['technical', 'support'],
    booking_question: ['booking', 'sales'],
    vendor_search: ['vendors', 'planning'],
    wedding_planning: ['planning', 'coordination'],
    billing_issue: ['billing', 'finance'],
    general_question: [],
    complex_query: ['senior_support'],
    complaint: ['escalation', 'senior_support'],
  };

  return specialtyMap[reason] || [];
}

async function createHumanSupportChatRoom(
  supabase: any,
  params: {
    escalation_id: string;
    user_id?: string;
    agent_id: string;
    session_id: string;
  },
) {
  try {
    // Create chat room for human support
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: `Support Chat - ${params.session_id}`,
        room_type: 'private',
        description: `Escalated chatbot conversation`,
        is_active: true,
        allow_attachments: true,
        created_by: params.agent_id,
        metadata: {
          escalation_id: params.escalation_id,
          session_id: params.session_id,
          type: 'chatbot_escalation',
        },
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Add participants
    const participants = [
      {
        room_id: room.id,
        user_id: params.agent_id,
        participant_type: 'assistant',
        can_send_messages: true,
        can_share_files: true,
        can_add_participants: true,
        is_admin: true,
        status: 'active',
      },
    ];

    if (params.user_id) {
      participants.push({
        room_id: room.id,
        user_id: params.user_id,
        participant_type: 'client',
        can_send_messages: true,
        can_share_files: true,
        can_add_participants: false,
        is_admin: false,
        status: 'active',
      });
    }

    await supabase.from('chat_room_participants').insert(participants);

    return room;
  } catch (error) {
    console.error('Create support room error:', error);
    return null;
  }
}

async function notifyAgent(supabase: any, agentId: string, escalation: any) {
  try {
    // Create notification for the agent
    await supabase.from('agent_notifications').insert({
      agent_id: agentId,
      type: 'new_escalation',
      title: 'New Chatbot Escalation',
      message: `New support request escalated from chatbot: ${escalation.reason}`,
      escalation_id: escalation.id,
      priority: escalation.priority,
      created_at: new Date().toISOString(),
    });

    // Here you could also integrate with push notifications, Slack, etc.
  } catch (error) {
    console.error('Agent notification error:', error);
  }
}

async function getEstimatedWaitTime(
  supabase: any,
  priority: string,
): Promise<number> {
  try {
    // Calculate estimated wait time based on current queue
    const { data: queueData } = await supabase
      .from('chatbot_escalations')
      .select('priority, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!queueData || queueData.length === 0) {
      return 300; // 5 minutes default
    }

    // Simple estimation: 10 minutes per item in queue, with priority adjustments
    const baseTime = queueData.length * 600; // 10 minutes per item
    const priorityMultiplier =
      priority === 'urgent' ? 0.5 : priority === 'high' ? 0.7 : 1.0;

    return Math.max(300, baseTime * priorityMultiplier); // Minimum 5 minutes
  } catch (error) {
    console.error('Estimate wait time error:', error);
    return 900; // 15 minutes fallback
  }
}

async function sendEscalationNotification(
  escalationRequest: EscalationRequest,
  agent?: HumanAgent,
) {
  try {
    // This would integrate with your email service
    // For now, we'll just log it
    console.log('Escalation notification would be sent:', {
      escalation: escalationRequest.session_id,
      agent: agent?.name || 'Queue',
      reason: escalationRequest.reason,
      priority: escalationRequest.priority,
    });
  } catch (error) {
    console.error('Send notification error:', error);
  }
}
