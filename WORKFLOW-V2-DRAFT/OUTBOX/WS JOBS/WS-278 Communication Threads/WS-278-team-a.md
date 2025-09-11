# WS-278 Communication Threads - Team A Comprehensive Prompt
**Team A: Frontend/UI Specialists**

## 🎯 Your Mission: Beautiful Wedding Communication Interface  
You are the **Frontend/UI specialists** responsible for creating an intuitive, real-time messaging interface that keeps wedding conversations organized and accessible. Your focus: **Chat-like interface that couples and vendors actually want to use, with threading, file sharing, and instant messaging that feels as smooth as WhatsApp but organized like Slack**.

## 💝 The Wedding Communication Chaos Challenge
**Context**: Emma is planning her wedding and has 15 different email threads with her caterer about menu changes - some emails include the venue, others include the wedding planner, and important decisions are buried in reply chains. She needs one organized place where all catering discussions live, everyone can see the full conversation, and new messages appear instantly. **Your interface must make wedding communication feel effortless and organized instead of chaotic and scattered**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/components/messaging/ThreadManager.tsx`** - Main thread management interface
2. **`/src/components/messaging/ThreadSidebar.tsx`** - Thread list with unread indicators  
3. **`/src/components/messaging/ThreadMessagesView.tsx`** - Real-time message display
4. **`/src/components/messaging/MessageComposer.tsx`** - Message input with rich features
5. **`/src/components/messaging/ThreadCreationModal.tsx`** - New thread creation modal

### 🎨 UI/UX Requirements:
- **Real-time Updates**: Messages appear instantly without page refresh
- **Thread Organization**: Sidebar shows all threads with unread counts and priorities
- **Rich Messaging**: Support text, images, files, replies, and @mentions
- **Mobile Responsive**: Perfect experience on phones during venue visits
- **Wedding Context**: Thread types for vendor coordination, planning, emergencies
- **Visual Polish**: Beautiful, modern interface that couples want to show vendors

Your messaging interface transforms chaotic wedding communication into organized, real-time conversations.

## 🛠️ Technical Requirements Using WedSync Stack

### 📦 Required React 19 Patterns & Libraries
```typescript
// MANDATORY: Use these EXACT imports and patterns
import { useState, useTransition, useEffect, useRef } from 'react';
import { useActionState } from 'react'; // React 19 form handling
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

// Real-time messaging
import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

// State management
import { useThreadStore } from '@/lib/stores/thread-store'; // Zustand
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Icons (Lucide React)
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Image, 
  Reply, 
  Users, 
  Search,
  Archive,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
```

### 🎨 Component Architecture

#### 1. ThreadManager Main Component
```typescript
// File: /src/components/messaging/ThreadManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { ThreadSidebar } from './ThreadSidebar';
import { ThreadMessagesView } from './ThreadMessagesView';
import { ThreadCreationModal } from './ThreadCreationModal';
import { useThreadStore } from '@/lib/stores/thread-store';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';
import { MessageCircle, Plus } from 'lucide-react';

interface ThreadManagerProps {
  weddingId: string;
  currentUserId: string;
  userRole: 'couple' | 'vendor' | 'planner' | 'venue' | 'coordinator';
}

interface Thread {
  id: string;
  title: string;
  threadType: 'vendor_coordination' | 'task_discussion' | 'general_planning' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  participantCount: number;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  status: 'active' | 'archived' | 'closed';
}

export function ThreadManager({ weddingId, currentUserId, userRole }: ThreadManagerProps) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    threads,
    isLoading,
    loadThreads,
    createThread,
    markThreadAsRead,
    archiveThread
  } = useThreadStore();

  // Real-time subscription for thread updates
  const { subscribeToThreadUpdates } = useSupabaseRealtime();

  useEffect(() => {
    // Load initial threads
    loadThreads(weddingId, currentUserId);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToThreadUpdates(weddingId, currentUserId, (update) => {
      // Handle real-time thread updates
      handleThreadUpdate(update);
    });

    return () => unsubscribe();
  }, [weddingId, currentUserId]);

  const handleThreadUpdate = (update: ThreadUpdate) => {
    switch (update.type) {
      case 'new_message':
        // Update thread with new message and unread count
        break;
      case 'thread_created':
        // Add new thread to list
        break;
      case 'participant_added':
        // Update participant count
        break;
    }
  };

  const handleCreateThread = async (threadData: CreateThreadRequest) => {
    try {
      const newThread = await createThread(threadData);
      setActiveThreadId(newThread.id);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    setActiveThreadId(threadId);
    await markThreadAsRead(threadId, currentUserId);
  };

  // Filter threads based on search
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort threads by priority and last activity
  const sortedThreads = filteredThreads.sort((a, b) => {
    // Priority sorting
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    // Then by last message time
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <div className="text-lg font-medium text-gray-900">Loading conversations...</div>
          <div className="text-sm text-gray-600">Getting your wedding discussions ready</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Thread Sidebar */}
      <ThreadSidebar
        threads={sortedThreads}
        activeThreadId={activeThreadId}
        onThreadSelect={handleThreadSelect}
        onCreateThread={() => setIsCreateModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        userRole={userRole}
      />

      {/* Main Messages Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeThreadId ? (
          <ThreadMessagesView
            threadId={activeThreadId}
            currentUserId={currentUserId}
            userRole={userRole}
            onArchiveThread={() => archiveThread(activeThreadId)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-sm">
              <MessageCircle className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 mb-6">
                Choose a conversation from the sidebar to start messaging with your wedding team
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Thread Creation Modal */}
      <ThreadCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateThread={handleCreateThread}
        weddingId={weddingId}
        currentUserId={currentUserId}
        userRole={userRole}
      />
    </div>
  );
}
```

#### 2. ThreadSidebar Component
```typescript
// File: /src/components/messaging/ThreadSidebar.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Plus, 
  Archive,
  AlertTriangle,
  Users,
  Calendar,
  Settings,
  MessageCircle
} from 'lucide-react';

interface ThreadSidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onCreateThread: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userRole: string;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  onThreadSelect,
  onCreateThread,
  searchQuery,
  onSearchChange,
  userRole
}: ThreadSidebarProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const getThreadTypeIcon = (threadType: string) => {
    switch (threadType) {
      case 'vendor_coordination':
        return <Users className="w-4 h-4" />;
      case 'task_discussion':
        return <Calendar className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      case 'general_planning':
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${variants[priority as keyof typeof variants]}`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredThreads = threads.filter(thread => {
    if (selectedFilter === 'unread' && thread.unreadCount === 0) return false;
    if (selectedFilter === 'urgent' && thread.priority !== 'urgent') return false;
    if (selectedFilter === 'archived' && thread.status !== 'archived') return false;
    return true;
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <Button
            size="sm"
            onClick={onCreateThread}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {['all', 'unread', 'urgent', 'archived'].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className="whitespace-nowrap text-xs"
            >
              {filter === 'all' && `All (${threads.length})`}
              {filter === 'unread' && `Unread (${threads.filter(t => t.unreadCount > 0).length})`}
              {filter === 'urgent' && `Urgent (${threads.filter(t => t.priority === 'urgent').length})`}
              {filter === 'archived' && `Archived (${threads.filter(t => t.status === 'archived').length})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600">
                {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateThread}
                  className="mt-3"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Start First Conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => onThreadSelect(thread.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-150 ${
                    activeThreadId === thread.id
                      ? 'bg-pink-50 border-2 border-pink-200 shadow-sm'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="text-gray-400 flex-shrink-0">
                        {getThreadTypeIcon(thread.threadType)}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate text-sm">
                        {thread.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-pink-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                        </Badge>
                      )}
                      {getPriorityBadge(thread.priority)}
                    </div>
                  </div>

                  {/* Last Message */}
                  {thread.lastMessage && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 truncate">
                        <span className="font-medium">
                          {thread.lastMessage.senderName}:
                        </span>{' '}
                        {thread.lastMessage.content}
                      </p>
                    </div>
                  )}

                  {/* Thread Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {thread.participantCount}
                      </span>
                      {thread.status === 'archived' && (
                        <span className="flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Archived
                        </span>
                      )}
                    </div>
                    {thread.lastMessage && (
                      <span>{formatTimeAgo(thread.lastMessage.createdAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

#### 3. ThreadMessagesView Component
```typescript
// File: /src/components/messaging/ThreadMessagesView.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageComposer } from './MessageComposer';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';
import { useThreadMessages } from '@/hooks/use-thread-messages';
import { 
  Reply, 
  MoreVertical, 
  Archive,
  Users,
  Settings,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ThreadMessagesViewProps {
  threadId: string;
  currentUserId: string;
  userRole: string;
  onArchiveThread: () => void;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments: FileAttachment[];
  replyTo: string | null;
  replyToMessage?: Message;
  createdAt: string;
  editedAt: string | null;
}

export function ThreadMessagesView({
  threadId,
  currentUserId,
  userRole,
  onArchiveThread
}: ThreadMessagesViewProps) {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    participants,
    threadDetails,
    isLoading,
    sendMessage,
    markAsRead
  } = useThreadMessages(threadId, currentUserId);

  const { subscribeToThreadMessages } = useSupabaseRealtime();

  useEffect(() => {
    // Subscribe to real-time message updates
    const unsubscribe = subscribeToThreadMessages(threadId, (message: Message) => {
      // Message will be handled by the hook
      scrollToBottom();
    });

    // Mark thread as read when viewing
    markAsRead();

    return () => unsubscribe();
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, attachments?: FileAttachment[], replyToId?: string) => {
    try {
      await sendMessage({
        content,
        messageType: 'text',
        attachments: attachments || [],
        replyTo: replyToId
      });
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleString();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      couple: 'text-pink-600 bg-pink-50',
      vendor: 'text-blue-600 bg-blue-50',
      planner: 'text-purple-600 bg-purple-50',
      venue: 'text-green-600 bg-green-50',
      coordinator: 'text-orange-600 bg-orange-50'
    };
    return colors[role as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{threadDetails?.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">
                  {participants.length} participants
                </span>
                {threadDetails?.priority === 'urgent' && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    URGENT
                  </span>
                )}
                {threadDetails?.priority === 'high' && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    HIGH PRIORITY
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onArchiveThread}>
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUserId;
            const showAvatar = !isOwnMessage && (
              index === 0 || 
              messages[index - 1].senderId !== message.senderId
            );

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.senderAvatar} />
                      <AvatarFallback className="text-xs">
                        {message.senderName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-xs lg:max-w-md ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                  {/* Sender Info */}
                  {showAvatar && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-sm font-medium text-gray-900">
                        {message.senderName}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(message.senderRole)}`}>
                        {message.senderRole}
                      </span>
                    </div>
                  )}

                  {/* Reply Context */}
                  {message.replyToMessage && (
                    <div className={`mb-2 p-2 bg-gray-100 rounded-lg border-l-2 border-gray-300 ${isOwnMessage ? 'ml-8' : 'mr-8'}`}>
                      <div className="text-xs font-medium text-gray-700">
                        {message.replyToMessage.senderName}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {message.replyToMessage.content}
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">{message.content}</div>
                    
                    {/* Attachments */}
                    {message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="bg-white bg-opacity-20 rounded-lg p-2">
                            <div className="text-xs font-medium">{attachment.name}</div>
                            <div className="text-xs opacity-75">{attachment.size}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Time & Status */}
                    <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs ${isOwnMessage ? 'text-pink-200' : 'text-gray-500'}`}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isOwnMessage && (
                        <CheckCircle2 className={`w-3 h-3 ${isOwnMessage ? 'text-pink-200' : 'text-gray-400'}`} />
                      )}
                    </div>
                  </div>

                  {/* Message Actions */}
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(message)}
                        className="text-xs h-6 px-2"
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Context Bar */}
      {replyingTo && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Replying to <span className="font-medium">{replyingTo.senderName}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
          <div className="mt-1 text-xs text-gray-500 truncate">
            {replyingTo.content}
          </div>
        </div>
      )}

      {/* Message Composer */}
      <MessageComposer
        threadId={threadId}
        participants={participants}
        replyingTo={replyingTo}
        onSendMessage={handleSendMessage}
        onClearReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
```

#### 4. MessageComposer Component
```typescript
// File: /src/components/messaging/MessageComposer.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Image, 
  Smile,
  AtSign
} from 'lucide-react';

interface MessageComposerProps {
  threadId: string;
  participants: ThreadParticipant[];
  replyingTo?: Message | null;
  onSendMessage: (content: string, attachments?: FileAttachment[], replyToId?: string) => Promise<void>;
  onClearReply: () => void;
}

interface FileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export function MessageComposer({
  threadId,
  participants,
  replyingTo,
  onSendMessage,
  onClearReply
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      await onSendMessage(
        message.trim(),
        attachments,
        replyingTo?.id
      );
      
      // Clear form
      setMessage('');
      setAttachments([]);
      if (replyingTo) onClearReply();
      
      // Focus back to textarea
      textareaRef.current?.focus();
      
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Upload file to Supabase Storage
        const formData = new FormData();
        formData.append('file', file);
        formData.append('threadId', threadId);
        
        const response = await fetch('/api/threads/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const result = await response.json();
        return {
          id: result.id,
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          url: result.url
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedFiles]);
      
      toast({
        title: "Files uploaded",
        description: `${uploadedFiles.length} file(s) ready to send`
      });
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {attachment.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {attachment.size}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-32 resize-none border-gray-300 focus:border-pink-500 focus:ring-pink-500"
              disabled={isSending}
            />
          </div>
          
          <div className="flex items-end gap-2">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
              className="h-11 w-11 p-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={(!message.trim() && attachments.length === 0) || isSending}
              className="h-11 w-11 p-0 bg-pink-600 hover:bg-pink-700"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
          
          {message.length > 0 && (
            <span className={message.length > 500 ? 'text-red-500' : ''}>
              {message.length}/1000
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 5. ThreadCreationModal Component
```typescript
// File: /src/components/messaging/ThreadCreationModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  AlertTriangle,
  Settings,
  X
} from 'lucide-react';

interface ThreadCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateThread: (threadData: CreateThreadRequest) => void;
  weddingId: string;
  currentUserId: string;
  userRole: string;
}

interface ThreadParticipant {
  userId: string;
  name: string;
  role: 'couple' | 'vendor' | 'planner' | 'venue' | 'coordinator';
  avatar?: string;
}

export function ThreadCreationModal({
  isOpen,
  onClose,
  onCreateThread,
  weddingId,
  currentUserId,
  userRole
}: ThreadCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [threadType, setThreadType] = useState<string>('general_planning');
  const [priority, setPriority] = useState<string>('normal');
  const [selectedParticipants, setSelectedParticipants] = useState<ThreadParticipant[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Mock available participants (would be fetched from API)
  const availableParticipants: ThreadParticipant[] = [
    { userId: '1', name: 'Emma Johnson', role: 'couple', avatar: '' },
    { userId: '2', name: 'James Wilson', role: 'couple', avatar: '' },
    { userId: '3', name: 'Sarah Miller - Photography', role: 'vendor', avatar: '' },
    { userId: '4', name: 'Elite Catering Services', role: 'vendor', avatar: '' },
    { userId: '5', name: 'Garden Manor Events', role: 'venue', avatar: '' },
    { userId: '6', name: 'Perfect Day Weddings', role: 'planner', avatar: '' },
  ];

  const threadTypeOptions = [
    {
      value: 'general_planning',
      label: 'General Planning',
      icon: MessageCircle,
      description: 'General wedding planning discussions'
    },
    {
      value: 'vendor_coordination',
      label: 'Vendor Coordination',
      icon: Users,
      description: 'Coordination with specific vendors'
    },
    {
      value: 'task_discussion',
      label: 'Task Discussion',
      icon: Calendar,
      description: 'Specific task or timeline discussions'
    },
    {
      value: 'emergency',
      label: 'Emergency',
      icon: AlertTriangle,
      description: 'Urgent matters requiring immediate attention'
    }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the conversation",
        variant: "destructive"
      });
      return;
    }

    if (selectedParticipants.length === 0) {
      toast({
        title: "Participants required",
        description: "Please add at least one participant",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const threadData: CreateThreadRequest = {
        weddingId,
        title: title.trim(),
        description: description.trim() || undefined,
        threadType: threadType as any,
        priority: priority as any,
        participants: selectedParticipants.map(p => ({
          userId: p.userId,
          role: p.role
        })),
        initialMessage: initialMessage.trim() || undefined
      };

      await onCreateThread(threadData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setThreadType('general_planning');
      setPriority('normal');
      setSelectedParticipants([]);
      setInitialMessage('');
      
      toast({
        title: "Conversation created!",
        description: "Your new conversation is ready"
      });
      
    } catch (error) {
      toast({
        title: "Failed to create conversation",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleParticipant = (participant: ThreadParticipant) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.userId === participant.userId);
      if (exists) {
        return prev.filter(p => p.userId !== participant.userId);
      } else {
        return [...prev, participant];
      }
    });
  };

  const selectedType = threadTypeOptions.find(t => t.value === threadType);
  const selectedPriority = priorityOptions.find(p => p.value === priority);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Start New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Conversation Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Catering Menu Discussion"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this conversation is about..."
                className="mt-1 h-20"
              />
            </div>
          </div>

          {/* Thread Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select value={threadType} onValueChange={setThreadType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {threadTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <Badge variant="outline" className={option.color}>
                        {option.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Add Participants ({selectedParticipants.length} selected)
            </label>
            
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {availableParticipants.map((participant) => {
                const isSelected = selectedParticipants.some(p => p.userId === participant.userId);
                return (
                  <div
                    key={participant.userId}
                    onClick={() => toggleParticipant(participant)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-pink-50 border border-pink-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{participant.role}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Participants Summary */}
            {selectedParticipants.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((participant) => (
                    <Badge 
                      key={participant.userId} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {participant.name}
                      <button
                        onClick={() => toggleParticipant(participant)}
                        className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Initial Message */}
          <div>
            <label className="text-sm font-medium text-gray-700">Initial Message (Optional)</label>
            <Textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Start the conversation with a message..."
              className="mt-1 h-24"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!title.trim() || selectedParticipants.length === 0 || isCreating}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Create Conversation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## 📱 Mobile Optimization Requirements

### Mobile-First Considerations
```typescript
// Mobile-specific styling and interactions
const mobileStyles = {
  // Touch-friendly messaging interface
  messageInput: 'min-h-12 text-base', // Prevents zoom on iOS
  
  // Bottom sheet thread selector for mobile
  mobileThreadSheet: 'sm:hidden block',
  
  // Optimized message bubbles for thumb scrolling
  messageBubble: 'max-w-[85%] touch-manipulation',
  
  // Fixed composer for mobile typing
  fixedComposer: 'sticky bottom-0 bg-white border-t sm:static sm:border-0'
};
```

## 🧪 Required Tests

### Component Tests
```typescript
// File: /src/components/messaging/__tests__/thread-manager.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadManager } from '../ThreadManager';

describe('ThreadManager', () => {
  it('should display thread list with unread counts', () => {
    render(
      <ThreadManager
        weddingId="test-wedding"
        currentUserId="test-user"
        userRole="couple"
      />
    );
    
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
  });

  it('should open thread creation modal', async () => {
    render(
      <ThreadManager
        weddingId="test-wedding"
        currentUserId="test-user"
        userRole="couple"
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /new/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
    });
  });

  it('should handle thread selection and message display', async () => {
    // Mock thread data
    const mockThreads = [
      {
        id: 'thread-1',
        title: 'Catering Discussion',
        unreadCount: 3,
        lastMessage: { content: 'Menu updated', senderName: 'Chef' }
      }
    ];

    render(
      <ThreadManager
        weddingId="test-wedding"
        currentUserId="test-user"
        userRole="couple"
      />
    );

    // Click on thread
    fireEvent.click(screen.getByText('Catering Discussion'));
    
    // Should show message area
    await waitFor(() => {
      expect(screen.getByText('Menu updated')).toBeInTheDocument();
    });
  });
});
```

## ✅ Acceptance Criteria Checklist

- [ ] **Thread Creation** allows organizing conversations by topic with participant selection
- [ ] **Real-time Messaging** displays new messages instantly without page refresh
- [ ] **Thread Sidebar** shows all conversations with unread counts and priority indicators
- [ ] **Message Threading** supports replies and message context for organized discussions
- [ ] **File Attachments** enables sharing images and documents in conversation threads
- [ ] **Mobile Responsive** provides excellent chat experience on phones and tablets
- [ ] **Search & Filter** allows finding conversations by title, content, or participants
- [ ] **Priority System** highlights urgent conversations and emergency discussions
- [ ] **Participant Management** shows who's in each conversation with role indicators
- [ ] **Navigation Integration** accessible from main wedding dashboard with message counts

## 📱 Navigation Integration Requirements

### Mandatory Integration Points
- [ ] **Messages Tab** in main wedding dashboard navigation
- [ ] **Unread Indicators** show message counts in navigation badges
- [ ] **Priority Notifications** highlight urgent messages in navigation
- [ ] **Mobile Menu Integration** includes messaging in mobile navigation
- [ ] **Keyboard Shortcuts** for switching between threads (Ctrl+1, Ctrl+2, etc.)

Your messaging interface transforms scattered wedding communication into organized, real-time conversations that couples and vendors love using.

**Remember**: Clear communication prevents wedding day disasters. Make this interface so intuitive that even stressed couples and busy vendors can easily stay connected! 💬💍