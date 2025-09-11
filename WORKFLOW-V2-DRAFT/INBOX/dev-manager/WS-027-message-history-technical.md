# WS-027: Message History - Technical Specification

## User Story

**As a wedding coordinator**, I need a unified communication log that shows all interactions with each client across email, SMS, and WhatsApp so I can maintain conversation context, track engagement patterns, and provide consistent service.

**Real Wedding Scenario**: Emma, a wedding coordinator, receives a call from a bride asking about a previous conversation regarding venue changes. She opens the client's message history in WedSync and sees the complete timeline: initial email inquiry (2 weeks ago), follow-up SMS (1 week ago), WhatsApp photos exchange (3 days ago), and her response email (yesterday). She can quickly reference the specific details and continue the conversation seamlessly.

## Database Schema

```sql
-- Unified message history across all channels
CREATE TABLE message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID, -- Groups related messages
  thread_id UUID, -- Email thread or WhatsApp session
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp', 'in_app'
  direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
  message_type VARCHAR(30) NOT NULL, -- 'text', 'html', 'image', 'document', 'voice', 'video'
  subject VARCHAR(500), -- Email subject or message title
  content_text TEXT, -- Plain text content
  content_html TEXT, -- HTML content for emails
  metadata JSONB DEFAULT '{}', -- Channel-specific data
  attachments JSONB DEFAULT '[]', -- File attachments
  sender_name VARCHAR(100),
  sender_identifier VARCHAR(255), -- Email address or phone number
  recipient_identifiers JSONB DEFAULT '[]', -- Multiple recipients
  message_status VARCHAR(20) DEFAULT 'delivered', -- 'sent', 'delivered', 'read', 'failed'
  external_message_id VARCHAR(200), -- Provider's message ID
  timestamp TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  replied_to_message_id UUID REFERENCES message_history(id),
  is_automated BOOLEAN DEFAULT FALSE,
  journey_module_id UUID, -- If part of automated journey
  campaign_id UUID, -- If part of bulk campaign
  sentiment_score DECIMAL(3,2), -- AI sentiment analysis (-1.0 to 1.0)
  importance_level INTEGER DEFAULT 3, -- 1=low, 3=normal, 5=high
  tags JSONB DEFAULT '[]',
  search_vector TSVECTOR, -- Full-text search
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_message_history_client_timestamp (client_id, timestamp DESC),
  INDEX idx_message_history_supplier_timestamp (supplier_id, timestamp DESC),
  INDEX idx_message_history_conversation (conversation_id, timestamp),
  INDEX idx_message_history_channel_status (channel, message_status),
  INDEX idx_message_history_search (search_vector) USING GIN,
  INDEX idx_message_history_thread (thread_id, timestamp),
  INDEX idx_message_history_direction_timestamp (direction, timestamp)
);

-- Conversation groupings
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(200),
  description TEXT,
  primary_channel VARCHAR(20),
  started_at TIMESTAMPTZ NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_to UUID REFERENCES suppliers(id), -- For team assignments
  priority INTEGER DEFAULT 3, -- 1=low, 3=normal, 5=high
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_conversations_client (client_id, last_message_at DESC),
  INDEX idx_conversations_supplier_active (supplier_id, is_active, last_message_at DESC),
  INDEX idx_conversations_assigned (assigned_to, is_active)
);

-- Message attachments and media
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message_history(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  file_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  is_inline BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_attachments_message (message_id),
  INDEX idx_attachments_type (mime_type)
);

-- Message templates and quick replies
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_category VARCHAR(50),
  channel VARCHAR(20) NOT NULL,
  subject_template VARCHAR(200),
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_templates_supplier_channel (supplier_id, channel, is_active),
  UNIQUE(supplier_id, template_name, channel)
);

-- Communication analytics and insights
CREATE TABLE communication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel VARCHAR(20) NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  response_time_avg_minutes INTEGER,
  engagement_score DECIMAL(3,2),
  sentiment_avg DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, client_id, date, channel),
  INDEX idx_comm_analytics_supplier_date (supplier_id, date),
  INDEX idx_comm_analytics_client_date (client_id, date)
);

-- Search and filter configurations
CREATE TABLE message_search_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  search_name VARCHAR(100) NOT NULL,
  filter_criteria JSONB NOT NULL,
  is_saved BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_search_configs_supplier (supplier_id, is_saved)
);

-- Message read receipts and tracking
CREATE TABLE message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message_history(id) ON DELETE CASCADE,
  reader_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, reader_id),
  INDEX idx_read_status_message (message_id),
  INDEX idx_read_status_reader (reader_id, read_at)
);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sender_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
CREATE TRIGGER trigger_update_message_search_vector
  BEFORE INSERT OR UPDATE ON message_history
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Function to update conversation last message time
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message_at = NEW.timestamp,
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation updates
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON message_history
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION update_conversation_last_message();
```

## API Endpoints

```typescript
// Message history data types
interface MessageHistory {
  id: string;
  supplierId: string;
  clientId: string;
  conversationId?: string;
  threadId?: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'html' | 'image' | 'document' | 'voice' | 'video';
  subject?: string;
  contentText?: string;
  contentHtml?: string;
  metadata: Record<string, any>;
  attachments: MessageAttachment[];
  senderName?: string;
  senderIdentifier: string;
  recipientIdentifiers: string[];
  messageStatus: 'sent' | 'delivered' | 'read' | 'failed';
  externalMessageId?: string;
  timestamp: string;
  readAt?: string;
  repliedToMessageId?: string;
  isAutomated: boolean;
  journeyModuleId?: string;
  campaignId?: string;
  sentimentScore?: number;
  importanceLevel: number;
  tags: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  supplierId: string;
  clientId: string;
  title?: string;
  description?: string;
  primaryChannel: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  isActive: boolean;
  assignedTo?: string;
  priority: number;
  tags: string[];
  customFields: Record<string, any>;
  archivedAt?: string;
  recentMessages?: MessageHistory[];
  clientInfo?: {
    name: string;
    email: string;
    phone?: string;
    weddingDate?: string;
  };
}

interface MessageAttachment {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  isInline: boolean;
  downloadCount: number;
  uploadedAt: string;
}

interface CommunicationAnalytics {
  supplierId: string;
  clientId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  byChannel: ChannelMetrics[];
  responseTime: ResponseTimeMetrics;
  engagement: EngagementMetrics;
  sentiment: SentimentMetrics;
  trends: TrendMetrics[];
}

interface ChannelMetrics {
  channel: string;
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number;
  engagementScore: number;
}

// API Routes
// GET /api/message-history
interface GetMessageHistoryRequest {
  clientId?: string;
  conversationId?: string;
  channel?: string;
  direction?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string[];
  importance?: number;
  isAutomated?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'importance' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

interface GetMessageHistoryResponse {
  success: boolean;
  data: MessageHistory[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  aggregations?: {
    totalMessages: number;
    byChannel: Record<string, number>;
    byDirection: Record<string, number>;
    sentimentDistribution: Record<string, number>;
  };
}

// GET /api/message-history/conversations
interface GetConversationsRequest {
  clientId?: string;
  isActive?: boolean;
  assignedTo?: string;
  priority?: number;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

interface GetConversationsResponse {
  success: boolean;
  data: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// GET /api/message-history/conversations/:conversationId
interface GetConversationDetailsResponse {
  success: boolean;
  data: {
    conversation: Conversation;
    messages: MessageHistory[];
    analytics: {
      messageCount: number;
      averageResponseTime: number;
      sentimentTrend: Array<{ date: string; sentiment: number }>;
      channelDistribution: Record<string, number>;
    };
  };
}

// POST /api/message-history/search
interface SearchMessagesRequest {
  query: string;
  filters: {
    clientIds?: string[];
    channels?: string[];
    dateRange?: { start: string; end: string };
    importance?: number[];
    tags?: string[];
    hasAttachments?: boolean;
    isAutomated?: boolean;
  };
  page?: number;
  limit?: number;
}

interface SearchMessagesResponse {
  success: boolean;
  data: {
    messages: MessageHistory[];
    highlights: Record<string, string[]>; // Highlighted search terms
    facets: {
      channels: Array<{ channel: string; count: number }>;
      tags: Array<{ tag: string; count: number }>;
      dates: Array<{ date: string; count: number }>;
    };
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/message-history/conversations
interface CreateConversationRequest {
  clientId: string;
  title?: string;
  description?: string;
  primaryChannel: string;
  priority?: number;
  tags?: string[];
  assignedTo?: string;
}

interface CreateConversationResponse {
  success: boolean;
  data: Conversation;
}

// PUT /api/message-history/:messageId
interface UpdateMessageRequest {
  tags?: string[];
  importance?: number;
  archived?: boolean;
  customFields?: Record<string, any>;
}

interface UpdateMessageResponse {
  success: boolean;
  data: MessageHistory;
}

// POST /api/message-history/:messageId/reply
interface ReplyToMessageRequest {
  channel: 'email' | 'sms' | 'whatsapp';
  content: string;
  subject?: string;
  attachments?: string[]; // File IDs
  templateId?: string;
}

interface ReplyToMessageResponse {
  success: boolean;
  data: MessageHistory;
}

// GET /api/message-history/analytics
interface GetCommunicationAnalyticsRequest {
  clientId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  channels?: string[];
}

interface GetCommunicationAnalyticsResponse {
  success: boolean;
  data: CommunicationAnalytics;
}

// GET /api/message-history/templates
interface GetMessageTemplatesRequest {
  channel?: string;
  category?: string;
}

interface GetMessageTemplatesResponse {
  success: boolean;
  data: MessageTemplate[];
}

// POST /api/message-history/export
interface ExportMessageHistoryRequest {
  clientIds?: string[];
  conversationIds?: string[];
  dateRange?: { start: string; end: string };
  format: 'csv' | 'json' | 'pdf';
  includeAttachments?: boolean;
}

interface ExportMessageHistoryResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    expiresAt: string;
    fileSize: number;
  };
}
```

## Frontend Components

```typescript
// MessageHistoryDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MessageHistoryDashboardProps {
  supplierId: string;
  clientId?: string;
}

export const MessageHistoryDashboard: React.FC<MessageHistoryDashboardProps> = ({
  supplierId,
  clientId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [supplierId, clientId]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const params = new URLSearchParams({
        ...(clientId && { clientId }),
        isActive: 'true',
        limit: '50'
      });

      const response = await fetch(`/api/message-history/conversations?${params}`);
      const data = await response.json();
      setConversations(data.data);
      
      if (data.data.length > 0 && !selectedConversation) {
        setSelectedConversation(data.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/message-history/conversations/${conversationId}`);
      const data = await response.json();
      setMessages(data.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch('/api/message-history/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          filters: {
            ...(clientId && { clientIds: [clientId] }),
            ...filters
          }
        })
      });

      const data = await response.json();
      setMessages(data.data.messages);
      setSelectedConversation(null); // Clear conversation selection for search results
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  if (loading) return <div>Loading message history...</div>;

  return (
    <div className="h-screen flex">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            />
            <Button onClick={performSearch}>Search</Button>
          </div>
          
          <MessageFilters 
            filters={filters}
            onChange={setFilters}
            onApply={() => selectedConversation ? loadConversationMessages(selectedConversation) : performSearch()}
          />
        </div>

        <div className="overflow-y-auto">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversation === conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
            />
          ))}
        </div>
      </div>

      {/* Messages Content */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ConversationView
            conversationId={selectedConversation}
            messages={messages}
            onReply={(content) => handleReply(selectedConversation, content)}
          />
        ) : (
          <SearchResultsView
            messages={messages}
            searchQuery={searchQuery}
            onSelectMessage={(messageId) => {
              const message = messages.find(m => m.id === messageId);
              if (message?.conversationId) {
                setSelectedConversation(message.conversationId);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

// ConversationView.tsx
interface ConversationViewProps {
  conversationId: string;
  messages: MessageHistory[];
  onReply: (content: any) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  messages,
  onReply
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyChannel, setReplyChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Header */}
      <div className="p-4 border-b bg-white">
        <ConversationHeader conversationId={conversationId} />
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Reply Composer */}
      <div className="p-4 border-t bg-white">
        <MessageComposer
          onSend={(content) => {
            onReply({ ...content, channel: replyChannel });
            setReplyContent('');
          }}
          channels={['email', 'sms', 'whatsapp']}
          selectedChannel={replyChannel}
          onChannelChange={setReplyChannel}
        />
      </div>
    </div>
  );
};

// MessageBubble.tsx
interface MessageBubbleProps {
  message: MessageHistory;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[70%] rounded-lg p-4 ${
          isOutbound 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }
      `}>
        {/* Message Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ChannelIcon channel={message.channel} />
            <span className="text-xs opacity-75">
              {message.senderName || message.senderIdentifier}
            </span>
            {message.isAutomated && (
              <Badge variant="outline" className="text-xs">
                Auto
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </button>
        </div>

        {/* Subject (for emails) */}
        {message.subject && (
          <div className="font-medium mb-2 text-sm">
            {message.subject}
          </div>
        )}

        {/* Content */}
        <div className="text-sm">
          {message.messageType === 'html' && message.contentHtml ? (
            <div dangerouslySetInnerHTML={{ __html: message.contentHtml }} />
          ) : (
            <div className="whitespace-pre-wrap">{message.contentText}</div>
          )}
        </div>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Tags */}
        {message.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Sentiment & Importance */}
        <div className="mt-2 flex items-center justify-between text-xs opacity-75">
          <div className="flex items-center gap-2">
            {message.sentimentScore && (
              <SentimentIndicator score={message.sentimentScore} />
            )}
            <ImportanceIndicator level={message.importanceLevel} />
          </div>
          
          {/* Message Status */}
          <MessageStatusIndicator 
            status={message.messageStatus}
            readAt={message.readAt}
          />
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <MessageDetails message={message} />
        )}
      </div>
    </div>
  );
};

// MessageComposer.tsx
interface MessageComposerProps {
  onSend: (content: any) => void;
  channels: string[];
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  channels,
  selectedChannel,
  onChannelChange
}) => {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [selectedChannel]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/message-history/templates?channel=${selectedChannel}`);
      const data = await response.json();
      setTemplates(data.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSend = () => {
    if (!content.trim()) return;

    const messageContent: any = {
      content: content.trim(),
      attachments: attachments.map(file => file.name)
    };

    if (selectedChannel === 'email' && subject.trim()) {
      messageContent.subject = subject.trim();
    }

    onSend(messageContent);
    setContent('');
    setSubject('');
    setAttachments([]);
  };

  const applyTemplate = (template: MessageTemplate) => {
    setContent(template.contentTemplate);
    if (template.subjectTemplate) {
      setSubject(template.subjectTemplate);
    }
    setShowTemplates(false);
  };

  return (
    <div className="space-y-3">
      {/* Channel Selection */}
      <div className="flex gap-2">
        {channels.map((channel) => (
          <button
            key={channel}
            onClick={() => onChannelChange(channel)}
            className={`
              px-3 py-1 rounded text-sm transition-colors
              ${selectedChannel === channel 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            <ChannelIcon channel={channel} className="inline mr-1" />
            {channel.charAt(0).toUpperCase() + channel.slice(1)}
          </button>
        ))}
      </div>

      {/* Subject (Email only) */}
      {selectedChannel === 'email' && (
        <Input
          placeholder="Subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      )}

      {/* Content */}
      <div className="relative">
        <textarea
          placeholder={`Type your ${selectedChannel} message...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 border rounded-lg resize-none"
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSend();
            }
          }}
        />
        
        {/* Templates Dropdown */}
        {templates.length > 0 && (
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            📝
          </button>
        )}
      </div>

      {/* Templates List */}
      {showTemplates && (
        <div className="border rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium text-sm">{template.templateName}</div>
              <div className="text-xs text-gray-500 truncate">
                {template.contentTemplate}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            onChange={(e) => setAttachments(Array.from(e.target.files || []))}
            className="hidden"
            id="attachment-input"
          />
          <label
            htmlFor="attachment-input"
            className="cursor-pointer text-gray-500 hover:text-gray-700"
          >
            📎 Attach
          </label>
          
          {attachments.length > 0 && (
            <span className="text-xs text-gray-500">
              {attachments.length} file(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Cmd+Enter to send
          </span>
          <Button onClick={handleSend} disabled={!content.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
```

## Code Examples

### Message History Service

```typescript
// lib/services/message-history-service.ts
import { createClient } from '@supabase/supabase-js';

export class MessageHistoryService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async logMessage(messageData: Partial<MessageHistory>): Promise<MessageHistory> {
    // Auto-create conversation if needed
    let conversationId = messageData.conversationId;
    
    if (!conversationId && messageData.clientId) {
      conversationId = await this.getOrCreateConversation(
        messageData.supplierId!,
        messageData.clientId,
        messageData.channel!
      );
    }

    // Analyze sentiment if text content exists
    let sentimentScore;
    if (messageData.contentText) {
      sentimentScore = await this.analyzeSentiment(messageData.contentText);
    }

    const { data, error } = await this.supabase
      .from('message_history')
      .insert({
        ...messageData,
        conversation_id: conversationId,
        sentiment_score: sentimentScore,
        timestamp: messageData.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to log message: ${error.message}`);

    // Update analytics
    await this.updateCommunicationAnalytics(data);

    return data;
  }

  async getConversationHistory(
    conversationId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: MessageHistory[]; hasMore: boolean }> {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const { data: messages, error } = await this.supabase
      .from('message_history')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      messages: messages.reverse(), // Show oldest first in conversation
      hasMore: messages.length === limit
    };
  }

  async searchMessages(
    supplierId: string,
    query: string,
    filters: any = {}
  ): Promise<{ messages: MessageHistory[]; highlights: Record<string, string[]> }> {
    let queryBuilder = this.supabase
      .from('message_history')
      .select(`
        *,
        attachments:message_attachments(*)
      `)
      .eq('supplier_id', supplierId)
      .textSearch('search_vector', query);

    // Apply filters
    if (filters.clientIds?.length) {
      queryBuilder = queryBuilder.in('client_id', filters.clientIds);
    }

    if (filters.channels?.length) {
      queryBuilder = queryBuilder.in('channel', filters.channels);
    }

    if (filters.dateRange) {
      queryBuilder = queryBuilder
        .gte('timestamp', filters.dateRange.start)
        .lte('timestamp', filters.dateRange.end);
    }

    if (filters.importance?.length) {
      queryBuilder = queryBuilder.in('importance_level', filters.importance);
    }

    if (filters.tags?.length) {
      queryBuilder = queryBuilder.contains('tags', filters.tags);
    }

    if (filters.hasAttachments) {
      queryBuilder = queryBuilder.not('attachments', 'is', null);
    }

    if (typeof filters.isAutomated === 'boolean') {
      queryBuilder = queryBuilder.eq('is_automated', filters.isAutomated);
    }

    const { data: messages, error } = await queryBuilder
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Generate highlights (simplified - in production, use proper search highlighting)
    const highlights = this.generateSearchHighlights(messages, query);

    return { messages, highlights };
  }

  async getConversations(
    supplierId: string,
    filters: any = {}
  ): Promise<Conversation[]> {
    let queryBuilder = this.supabase
      .from('conversations')
      .select(`
        *,
        client:clients(id, name, email, phone, wedding_date),
        recent_messages:message_history(
          id, content_text, timestamp, channel, direction
        )
      `)
      .eq('supplier_id', supplierId);

    if (filters.clientId) {
      queryBuilder = queryBuilder.eq('client_id', filters.clientId);
    }

    if (typeof filters.isActive === 'boolean') {
      queryBuilder = queryBuilder.eq('is_active', filters.isActive);
    }

    if (filters.assignedTo) {
      queryBuilder = queryBuilder.eq('assigned_to', filters.assignedTo);
    }

    if (filters.priority) {
      queryBuilder = queryBuilder.eq('priority', filters.priority);
    }

    if (filters.tags?.length) {
      queryBuilder = queryBuilder.contains('tags', filters.tags);
    }

    const { data: conversations, error } = await queryBuilder
      .order('last_message_at', { ascending: false })
      .limit(filters.limit || 50);

    if (error) throw error;

    return conversations;
  }

  private async getOrCreateConversation(
    supplierId: string,
    clientId: string,
    channel: string
  ): Promise<string> {
    // Look for existing active conversation
    const { data: existing } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('primary_channel', channel)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const { data: newConversation, error } = await this.supabase
      .from('conversations')
      .insert({
        supplier_id: supplierId,
        client_id: clientId,
        primary_channel: channel,
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return newConversation.id;
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // Simple sentiment analysis - in production, integrate with AI service
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated'];
    
    const words = text.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount === 0 && negativeCount === 0) return 0;
    
    const totalCount = positiveCount + negativeCount;
    return (positiveCount - negativeCount) / totalCount;
  }

  private async updateCommunicationAnalytics(message: MessageHistory): Promise<void> {
    const date = new Date(message.timestamp).toISOString().split('T')[0];
    
    const { data: existing } = await this.supabase
      .from('communication_analytics')
      .select('*')
      .eq('supplier_id', message.supplierId)
      .eq('client_id', message.clientId)
      .eq('date', date)
      .eq('channel', message.channel)
      .single();

    if (existing) {
      const updates: any = {};
      
      if (message.direction === 'outbound') {
        updates.messages_sent = existing.messages_sent + 1;
      } else {
        updates.messages_received = existing.messages_received + 1;
      }

      if (message.sentimentScore) {
        const currentTotal = (existing.sentiment_avg || 0) * (existing.messages_sent + existing.messages_received);
        const newTotal = existing.messages_sent + existing.messages_received + 1;
        updates.sentiment_avg = (currentTotal + message.sentimentScore) / newTotal;
      }

      await this.supabase
        .from('communication_analytics')
        .update(updates)
        .eq('id', existing.id);
    } else {
      await this.supabase
        .from('communication_analytics')
        .insert({
          supplier_id: message.supplierId,
          client_id: message.clientId,
          date,
          channel: message.channel,
          messages_sent: message.direction === 'outbound' ? 1 : 0,
          messages_received: message.direction === 'inbound' ? 1 : 0,
          sentiment_avg: message.sentimentScore || 0
        });
    }
  }

  async calculateResponseTimes(
    supplierId: string,
    dateRange: { start: string; end: string }
  ): Promise<{ averageMinutes: number; byChannel: Record<string, number> }> {
    // Get conversations with message pairs for response time calculation
    const { data: messages } = await this.supabase
      .from('message_history')
      .select('conversation_id, channel, direction, timestamp')
      .eq('supplier_id', supplierId)
      .gte('timestamp', dateRange.start)
      .lte('timestamp', dateRange.end)
      .order('conversation_id', { ascending: true })
      .order('timestamp', { ascending: true });

    const responseTimes: number[] = [];
    const byChannel: Record<string, number[]> = {};

    // Group by conversation and calculate response times
    const conversationGroups = messages?.reduce((acc, message) => {
      if (!acc[message.conversation_id]) acc[message.conversation_id] = [];
      acc[message.conversation_id].push(message);
      return acc;
    }, {} as Record<string, any[]>);

    Object.values(conversationGroups || {}).forEach(conversationMessages => {
      for (let i = 1; i < conversationMessages.length; i++) {
        const prev = conversationMessages[i - 1];
        const curr = conversationMessages[i];

        // Look for inbound -> outbound pattern (response)
        if (prev.direction === 'inbound' && curr.direction === 'outbound') {
          const responseTime = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60);
          
          responseTimes.push(responseTime);
          
          if (!byChannel[curr.channel]) byChannel[curr.channel] = [];
          byChannel[curr.channel].push(responseTime);
        }
      }
    });

    const averageMinutes = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const channelAverages = Object.entries(byChannel).reduce((acc, [channel, times]) => {
      acc[channel] = times.reduce((sum, time) => sum + time, 0) / times.length;
      return acc;
    }, {} as Record<string, number>);

    return { averageMinutes, byChannel: channelAverages };
  }

  private generateSearchHighlights(messages: MessageHistory[], query: string): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const queryTerms = query.toLowerCase().split(/\s+/);

    messages.forEach(message => {
      const messageHighlights: string[] = [];
      
      queryTerms.forEach(term => {
        if (message.contentText?.toLowerCase().includes(term)) {
          // Find context around the term
          const index = message.contentText.toLowerCase().indexOf(term);
          const start = Math.max(0, index - 30);
          const end = Math.min(message.contentText.length, index + term.length + 30);
          const snippet = message.contentText.substring(start, end);
          messageHighlights.push(`...${snippet}...`);
        }

        if (message.subject?.toLowerCase().includes(term)) {
          messageHighlights.push(message.subject);
        }
      });

      if (messageHighlights.length > 0) {
        highlights[message.id] = messageHighlights;
      }
    });

    return highlights;
  }

  async exportMessageHistory(
    supplierId: string,
    filters: any,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    // Get messages based on filters
    const messages = await this.getFilteredMessages(supplierId, filters);
    
    let fileContent: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        fileContent = this.generateCSV(messages);
        mimeType = 'text/csv';
        filename = `message-history-${Date.now()}.csv`;
        break;
      
      case 'json':
        fileContent = JSON.stringify(messages, null, 2);
        mimeType = 'application/json';
        filename = `message-history-${Date.now()}.json`;
        break;
      
      case 'pdf':
        fileContent = await this.generatePDF(messages);
        mimeType = 'application/pdf';
        filename = `message-history-${Date.now()}.pdf`;
        break;
    }

    // Upload to temporary storage (implementation depends on your storage solution)
    const downloadUrl = await this.uploadTempFile(fileContent, filename, mimeType);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    return { downloadUrl, expiresAt };
  }

  private generateCSV(messages: MessageHistory[]): string {
    const headers = [
      'Date',
      'Time', 
      'Channel',
      'Direction',
      'From',
      'To',
      'Subject',
      'Content',
      'Status',
      'Sentiment'
    ];

    const rows = messages.map(message => [
      new Date(message.timestamp).toLocaleDateString(),
      new Date(message.timestamp).toLocaleTimeString(),
      message.channel,
      message.direction,
      message.senderName || message.senderIdentifier,
      message.recipientIdentifiers.join(', '),
      message.subject || '',
      (message.contentText || '').replace(/\n/g, ' ').substring(0, 100),
      message.messageStatus,
      message.sentimentScore?.toFixed(2) || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}
```

## Test Requirements

```typescript
// __tests__/message-history.test.ts
import { MessageHistoryService } from '@/lib/services/message-history-service';

describe('Message History', () => {
  let historyService: MessageHistoryService;

  beforeEach(() => {
    historyService = new MessageHistoryService();
  });

  describe('Message Logging', () => {
    it('should log message with auto-conversation creation', async () => {
      const messageData = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        channel: 'email',
        direction: 'outbound',
        messageType: 'text',
        subject: 'Test Subject',
        contentText: 'Test message content',
        senderIdentifier: 'supplier@example.com',
        recipientIdentifiers: ['client@example.com'],
        messageStatus: 'sent'
      };

      const loggedMessage = await historyService.logMessage(messageData);

      expect(loggedMessage.id).toBeDefined();
      expect(loggedMessage.conversationId).toBeDefined();
      expect(loggedMessage.sentimentScore).toBeDefined();
    });

    it('should analyze sentiment correctly', async () => {
      const positiveMessage = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        channel: 'email',
        direction: 'inbound',
        messageType: 'text',
        contentText: 'This is amazing! I love the photos. Excellent work!',
        senderIdentifier: 'client@example.com',
        recipientIdentifiers: ['supplier@example.com']
      };

      const loggedMessage = await historyService.logMessage(positiveMessage);
      expect(loggedMessage.sentimentScore).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should search messages by text content', async () => {
      const searchResults = await historyService.searchMessages(
        'supplier-1',
        'wedding photography',
        {}
      );

      expect(searchResults.messages).toBeInstanceOf(Array);
      expect(searchResults.highlights).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const filters = {
        channels: ['email'],
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        importance: [4, 5]
      };

      const searchResults = await historyService.searchMessages(
        'supplier-1',
        'contract',
        filters
      );

      searchResults.messages.forEach(message => {
        expect(message.channel).toBe('email');
        expect([4, 5]).toContain(message.importanceLevel);
      });
    });
  });

  describe('Conversation Management', () => {
    it('should group related messages into conversations', async () => {
      const conversations = await historyService.getConversations('supplier-1');

      expect(conversations).toBeInstanceOf(Array);
      conversations.forEach(conversation => {
        expect(conversation.messageCount).toBeGreaterThan(0);
        expect(conversation.lastMessageAt).toBeDefined();
      });
    });

    it('should maintain conversation thread continuity', async () => {
      const conversationId = 'test-conversation-id';
      
      const { messages } = await historyService.getConversationHistory(conversationId);
      
      // Verify chronological order
      for (let i = 1; i < messages.length; i++) {
        const prevTime = new Date(messages[i-1].timestamp).getTime();
        const currTime = new Date(messages[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });

  describe('Analytics Calculation', () => {
    it('should calculate response times correctly', async () => {
      const responseMetrics = await historyService.calculateResponseTimes(
        'supplier-1',
        { start: '2024-06-01', end: '2024-06-30' }
      );

      expect(responseMetrics.averageMinutes).toBeGreaterThanOrEqual(0);
      expect(responseMetrics.byChannel).toBeDefined();
    });

    it('should update communication analytics', async () => {
      const message = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        channel: 'email',
        direction: 'outbound',
        messageType: 'text',
        contentText: 'Test message',
        timestamp: new Date().toISOString(),
        sentimentScore: 0.5
      };

      await historyService.updateCommunicationAnalytics(message);

      // Verify analytics were created/updated
      // This would require database checking in actual implementation
    });
  });

  describe('Export Functionality', () => {
    it('should export messages to CSV format', async () => {
      const result = await historyService.exportMessageHistory(
        'supplier-1',
        { clientIds: ['client-1'] },
        'csv'
      );

      expect(result.downloadUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate proper CSV structure', () => {
      const messages = [
        {
          timestamp: '2024-06-15T14:00:00Z',
          channel: 'email',
          direction: 'outbound',
          senderName: 'John Doe',
          subject: 'Test Subject',
          contentText: 'Test content',
          messageStatus: 'delivered',
          sentimentScore: 0.5
        }
      ];

      const csv = historyService.generateCSV(messages);
      const lines = csv.split('\n');
      
      expect(lines.length).toBeGreaterThan(1); // Header + data
      expect(lines[0]).toContain('Date');
      expect(lines[0]).toContain('Channel');
      expect(lines[1]).toContain('email');
    });
  });

  describe('Attachment Handling', () => {
    it('should log messages with attachments correctly', async () => {
      const messageWithAttachment = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        channel: 'email',
        direction: 'outbound',
        messageType: 'text',
        contentText: 'Please see attached contract',
        attachments: [
          {
            filename: 'contract.pdf',
            fileSize: 1024000,
            mimeType: 'application/pdf',
            fileUrl: 'https://example.com/contract.pdf'
          }
        ]
      };

      const loggedMessage = await historyService.logMessage(messageWithAttachment);
      expect(loggedMessage.attachments).toHaveLength(1);
      expect(loggedMessage.attachments[0].filename).toBe('contract.pdf');
    });
  });
});
```

## Dependencies

### External Services
- **AI Sentiment Analysis**: AWS Comprehend or Google Natural Language
- **Full-text Search**: PostgreSQL or Elasticsearch
- **File Storage**: AWS S3 or Google Cloud Storage
- **PDF Generation**: Puppeteer or jsPDF

### Internal Dependencies
- **Email Service**: Message ingestion
- **SMS Service**: Message ingestion  
- **WhatsApp Service**: Message ingestion
- **File Upload Service**: Attachment handling

## Effort Estimate

- **Database Schema**: 8 hours
- **Message Logging System**: 12 hours
- **Search Implementation**: 16 hours
- **Conversation Threading**: 10 hours
- **Analytics Calculation**: 12 hours
- **Frontend Components**: 24 hours
- **Export Functionality**: 8 hours
- **Attachment Handling**: 6 hours
- **Testing**: 16 hours
- **Documentation**: 4 hours

**Total Estimated Effort**: 116 hours (14.5 days)

## Success Metrics

- 100% message capture rate across all channels
- Search results returned within 500ms
- 99.9% conversation threading accuracy
- Sentiment analysis accuracy > 80%
- Export generation within 30 seconds
- 95% user satisfaction with message history features