# WS-278 Communication Threads - Team B Comprehensive Prompt
**Team B: Backend/API Specialists**

## 🎯 Your Mission: Rock-Solid Real-Time Messaging Backend
You are the **Backend/API specialists** responsible for building a reliable, real-time messaging system that handles wedding conversations at scale. Your focus: **Bullet-proof APIs, real-time message delivery, and database architecture that supports 1000+ concurrent conversations without dropping messages**.

## 💝 The Wedding Communication Backend Challenge
**Context**: Saturday morning wedding rush - 200 coordinators managing conversations with vendors, couples messaging planners about last-minute changes, and emergency threads that MUST deliver instantly. One dropped message could mean a missing photographer or wrong cake flavor. **Your backend must guarantee message delivery with real-time performance even during peak wedding season**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/app/api/threads/route.ts`** - Thread creation and listing API
2. **`/src/app/api/threads/[id]/messages/route.ts`** - Message sending and retrieval API
3. **`/src/lib/realtime/thread-subscriptions.ts`** - Supabase realtime message delivery
4. **`/supabase/migrations/010_communication_threads.sql`** - Complete database schema
5. **`/src/lib/services/thread-notification-service.ts`** - Message notification system

### 🔒 Backend Security Requirements:
- **Message Authentication**: All message endpoints verify sender permissions
- **Thread Access Control**: Users can only access threads they participate in
- **Rate Limiting**: Prevent message spam (max 60 messages per minute per user)
- **Content Validation**: Server-side message content validation and sanitization
- **Audit Logging**: All message activities logged for moderation and debugging

Your backend ensures wedding conversations flow seamlessly with enterprise-grade reliability.

## 🛠️ Core API Implementation

### Database Schema
```sql
-- File: /supabase/migrations/010_communication_threads.sql
-- Communication Threads - Real-time wedding conversation system

CREATE TABLE IF NOT EXISTS communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  thread_type VARCHAR(50) NOT NULL CHECK (thread_type IN ('vendor_coordination', 'task_discussion', 'general_planning', 'emergency')),
  created_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES communication_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('couple', 'vendor', 'planner', 'venue', 'coordinator')),
  can_add_participants BOOLEAN DEFAULT FALSE,
  can_archive_thread BOOLEAN DEFAULT FALSE,
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES communication_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'task_update')),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 2000),
  attachments JSONB DEFAULT '[]',
  reply_to UUID REFERENCES thread_messages(id),
  metadata JSONB DEFAULT '{}',
  edited_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_threads_wedding_status ON communication_threads(wedding_id, status) WHERE status = 'active';
CREATE INDEX idx_thread_participants_user ON thread_participants(user_id, last_read_at);
CREATE INDEX idx_thread_messages_thread_created ON thread_messages(thread_id, created_at DESC);
CREATE INDEX idx_thread_messages_reply_to ON thread_messages(reply_to) WHERE reply_to IS NOT NULL;

-- RLS Policies
ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;  
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see threads they participate in
CREATE POLICY "Users can view their thread participation" ON thread_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view threads they participate in" ON communication_threads
  FOR SELECT USING (
    id IN (
      SELECT thread_id FROM thread_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their threads" ON thread_messages
  FOR SELECT USING (
    thread_id IN (
      SELECT thread_id FROM thread_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to threads they participate in
CREATE POLICY "Users can send messages to their threads" ON thread_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    thread_id IN (
      SELECT thread_id FROM thread_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Function to update thread activity
CREATE OR REPLACE FUNCTION update_thread_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communication_threads 
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_message_activity
  AFTER INSERT ON thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_activity();
```

### Thread Management API
```typescript
// File: /src/app/api/threads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { ThreadNotificationService } from '@/lib/services/thread-notification-service';

const CreateThreadSchema = z.object({
  weddingId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  threadType: z.enum(['vendor_coordination', 'task_discussion', 'general_planning', 'emergency']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  participants: z.array(z.object({
    userId: z.string().uuid(),
    role: z.enum(['couple', 'vendor', 'planner', 'venue', 'coordinator'])
  })).min(1).max(50),
  initialMessage: z.string().max(2000).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 thread creations per hour
    const rateLimitResult = await rateLimit(`thread-create:${user.id}`, 10, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many thread creations. Please wait before creating more.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = CreateThreadSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user has access to the wedding
    const { data: weddingAccess, error: accessError } = await supabase
      .from('wedding_participants')
      .select('role')
      .eq('wedding_id', validatedData.weddingId)
      .eq('user_id', user.id)
      .single();

    if (accessError || !weddingAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('communication_threads')
      .insert({
        wedding_id: validatedData.weddingId,
        title: validatedData.title,
        description: validatedData.description,
        thread_type: validatedData.threadType,
        priority: validatedData.priority,
        created_by: user.id
      })
      .select()
      .single();

    if (threadError) {
      console.error('Thread creation error:', threadError);
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
    }

    // Add thread creator as participant with admin rights
    const participantsData = [
      {
        thread_id: thread.id,
        user_id: user.id,
        role: weddingAccess.role,
        can_add_participants: true,
        can_archive_thread: true
      },
      // Add other participants
      ...validatedData.participants.map(p => ({
        thread_id: thread.id,
        user_id: p.userId,
        role: p.role,
        can_add_participants: false,
        can_archive_thread: false
      }))
    ];

    const { error: participantsError } = await supabase
      .from('thread_participants')
      .insert(participantsData);

    if (participantsError) {
      // Rollback thread creation
      await supabase.from('communication_threads').delete().eq('id', thread.id);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // Send initial message if provided
    if (validatedData.initialMessage) {
      const { error: messageError } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: thread.id,
          sender_id: user.id,
          content: validatedData.initialMessage,
          message_type: 'text'
        });

      if (messageError) {
        console.error('Initial message error:', messageError);
        // Don't fail the thread creation for this
      }
    }

    // Send notifications to participants
    const notificationService = new ThreadNotificationService();
    await notificationService.notifyNewThread(
      thread.id,
      validatedData.participants.map(p => p.userId),
      user.id
    );

    return NextResponse.json({
      success: true,
      data: {
        threadId: thread.id,
        title: thread.title,
        participantCount: participantsData.length
      }
    });

  } catch (error) {
    console.error('Thread creation failed:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('weddingId');

    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get threads where user is participant
    const { data: threads, error } = await supabase
      .from('communication_threads')
      .select(`
        *,
        thread_participants!inner(
          user_id,
          last_read_at,
          role
        ),
        thread_messages(
          id,
          content,
          created_at,
          sender:auth.users(full_name),
          sender_id
        )
      `)
      .eq('wedding_id', weddingId)
      .eq('thread_participants.user_id', user.id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
    }

    // Format response with unread counts and participant info
    const formattedThreads = threads?.map(thread => {
      const userParticipant = thread.thread_participants.find((p: any) => p.user_id === user.id);
      const lastReadAt = userParticipant?.last_read_at || thread.created_at;
      
      const unreadCount = thread.thread_messages.filter((msg: any) => 
        new Date(msg.created_at) > new Date(lastReadAt) && 
        msg.sender_id !== user.id
      ).length;

      const lastMessage = thread.thread_messages[0];

      return {
        id: thread.id,
        title: thread.title,
        threadType: thread.thread_type,
        priority: thread.priority,
        participantCount: thread.message_count || 0,
        lastMessage: lastMessage ? {
          content: lastMessage.content.substring(0, 100),
          senderName: lastMessage.sender?.full_name || 'Unknown',
          createdAt: lastMessage.created_at
        } : null,
        unreadCount,
        status: thread.status,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at
      };
    }) || [];

    return NextResponse.json({ threads: formattedThreads });

  } catch (error) {
    console.error('Thread fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}
```

### Message API
```typescript
// File: /src/app/api/threads/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { ThreadNotificationService } from '@/lib/services/thread-notification-service';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'image', 'file']).default('text'),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    url: z.string().url()
  })).max(10).default([]),
  replyTo: z.string().uuid().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = params.id;

    // Rate limiting: 60 messages per minute
    const rateLimitResult = await rateLimit(`message-send:${user.id}`, 60, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = SendMessageSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user is participant in thread
    const { data: participant, error: participantError } = await supabase
      .from('thread_participants')
      .select('role, thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify reply-to message exists in this thread
    if (validatedData.replyTo) {
      const { data: replyMessage } = await supabase
        .from('thread_messages')
        .select('id')
        .eq('id', validatedData.replyTo)
        .eq('thread_id', threadId)
        .single();

      if (!replyMessage) {
        return NextResponse.json({ error: 'Invalid reply message' }, { status: 400 });
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('thread_messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content: validatedData.content,
        message_type: validatedData.messageType,
        attachments: validatedData.attachments,
        reply_to: validatedData.replyTo
      })
      .select(`
        *,
        sender:auth.users(full_name, avatar_url),
        reply_to_message:thread_messages!reply_to(
          content,
          sender:auth.users(full_name)
        )
      `)
      .single();

    if (messageError) {
      console.error('Message creation error:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update participant's last_read_at for sender
    await supabase
      .from('thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('user_id', user.id);

    // Send notifications to other participants
    const notificationService = new ThreadNotificationService();
    await notificationService.notifyNewMessage(
      threadId,
      message,
      user.id
    );

    // Format response
    const formattedMessage = {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender?.full_name || 'Unknown',
      senderAvatar: message.sender?.avatar_url,
      content: message.content,
      messageType: message.message_type,
      attachments: message.attachments || [],
      replyTo: message.reply_to,
      replyToMessage: message.reply_to_message ? {
        content: message.reply_to_message.content,
        senderName: message.reply_to_message.sender?.full_name
      } : null,
      createdAt: message.created_at,
      editedAt: message.edited_at
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error) {
    console.error('Message send failed:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threadId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify access
    const { data: participant } = await supabase
      .from('thread_participants')
      .select('role')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages with pagination
    const { data: messages, error } = await supabase
      .from('thread_messages')
      .select(`
        *,
        sender:auth.users(full_name, avatar_url),
        reply_to_message:thread_messages!reply_to(
          content,
          sender:auth.users(full_name)
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get thread participants
    const { data: participants } = await supabase
      .from('thread_participants')
      .select(`
        user_id,
        role,
        user:auth.users(full_name, avatar_url)
      `)
      .eq('thread_id', threadId);

    const formattedMessages = messages?.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: msg.sender?.full_name || 'Unknown',
      senderAvatar: msg.sender?.avatar_url,
      senderRole: participants?.find(p => p.user_id === msg.sender_id)?.role || 'unknown',
      content: msg.content,
      messageType: msg.message_type,
      attachments: msg.attachments || [],
      replyTo: msg.reply_to,
      replyToMessage: msg.reply_to_message,
      createdAt: msg.created_at,
      editedAt: msg.edited_at
    })).reverse() || []; // Reverse to show chronological order

    return NextResponse.json({
      messages: formattedMessages,
      participants: participants?.map(p => ({
        userId: p.user_id,
        name: p.user?.full_name || 'Unknown',
        avatar: p.user?.avatar_url,
        role: p.role
      })) || []
    });

  } catch (error) {
    console.error('Message fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
```

### Real-time Subscriptions
```typescript
// File: /src/lib/realtime/thread-subscriptions.ts
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

export interface ThreadUpdate {
  type: 'new_message' | 'thread_created' | 'participant_added' | 'thread_archived';
  threadId: string;
  data: any;
  timestamp: string;
}

export class ThreadRealtimeService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  private subscriptions = new Map<string, RealtimeChannel>();

  subscribeToThreadMessages(
    threadId: string,
    callback: (message: any) => void
  ): () => void {
    const channel = this.supabase
      .channel(`thread-messages-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'thread_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    this.subscriptions.set(`messages-${threadId}`, channel);

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`messages-${threadId}`);
    };
  }

  subscribeToUserThreads(
    userId: string,
    callback: (update: ThreadUpdate) => void
  ): () => void {
    const channel = this.supabase
      .channel(`user-threads-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_participants',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const updateType = payload.eventType === 'INSERT' ? 'thread_created' : 'participant_added';
        callback({
          type: updateType,
          threadId: payload.new.thread_id,
          data: payload.new,
          timestamp: new Date().toISOString()
        });
      })
      .subscribe();

    this.subscriptions.set(`user-${userId}`, channel);

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(`user-${userId}`);
    };
  }

  async markThreadAsRead(threadId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('thread_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark thread as read:', error);
    }
  }

  cleanup() {
    this.subscriptions.forEach(channel => channel.unsubscribe());
    this.subscriptions.clear();
  }
}
```

## 🧪 Testing Requirements

### API Tests
```typescript
// File: /src/app/api/threads/__tests__/route.test.ts
describe('/api/threads', () => {
  it('should create thread with participants', async () => {
    const response = await POST(mockRequest({
      weddingId: 'wedding-123',
      title: 'Catering Discussion',
      threadType: 'vendor_coordination',
      participants: [{ userId: 'user1', role: 'vendor' }]
    }));
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.threadId).toBeDefined();
  });

  it('should enforce rate limiting', async () => {
    // Create 11 threads rapidly (limit is 10/hour)
    for (let i = 0; i < 11; i++) {
      const response = await POST(mockRequest({ title: `Thread ${i}` }));
      if (i === 10) {
        expect(response.status).toBe(429);
      }
    }
  });
});
```

## ✅ Acceptance Criteria Checklist

- [ ] **Thread Creation API** handles participant management and permissions
- [ ] **Message Delivery API** processes text, files, and replies with rate limiting
- [ ] **Real-time Subscriptions** deliver messages instantly via Supabase Realtime
- [ ] **Database Schema** supports threading, participants, and message history
- [ ] **Security Validation** ensures users only access their conversation threads
- [ ] **Notification System** sends alerts for new messages via email/push/SMS
- [ ] **Performance Optimization** handles 1000+ concurrent conversations
- [ ] **Audit Logging** tracks all conversation activities for debugging
- [ ] **Content Validation** prevents spam and validates message content
- [ ] **Error Handling** provides graceful degradation during system overload

Your backend creates the reliable foundation for wedding conversation management.

**Remember**: Every message matters in wedding planning. Build with the reliability of a wedding photographer - never miss the shot! 💬💍