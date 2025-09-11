# WS-023: WhatsApp Setup - Technical Specification

## User Story

**As a wedding venue coordinator**, I need to communicate with couples via WhatsApp with rich media support so I can share venue photos, documents, and coordinate in real-time during the planning process.

**Real Wedding Scenario**: Emma, a venue coordinator, receives a WhatsApp message from a couple asking about last-minute changes to their reception layout. She quickly shares a photo of an alternative setup, sends a PDF with pricing details, and confirms the change with location sharing for the revised vendor entrance. All communication happens seamlessly in WhatsApp, creating a better experience than email chains.

## Database Schema

```sql
-- WhatsApp Business API configuration
CREATE TABLE whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  business_id VARCHAR(100) NOT NULL,
  phone_number_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  webhook_verify_token VARCHAR(100) NOT NULL,
  api_version VARCHAR(10) DEFAULT 'v18.0',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  business_profile JSONB DEFAULT '{}',
  messaging_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, phone_number_id)
);

-- WhatsApp message templates (pre-approved by Meta)
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_id VARCHAR(100) NOT NULL, -- Meta's template ID
  category VARCHAR(50), -- 'AUTHENTICATION', 'MARKETING', 'UTILITY'
  language VARCHAR(10) DEFAULT 'en_US',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  components JSONB NOT NULL, -- Template structure
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, template_name, language)
);

-- WhatsApp conversations and sessions
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  whatsapp_contact_id VARCHAR(20) NOT NULL, -- WhatsApp user ID
  phone_number VARCHAR(20) NOT NULL,
  contact_name VARCHAR(100),
  conversation_category VARCHAR(20) DEFAULT 'service', -- 'service', 'marketing', 'authentication'
  session_start_time TIMESTAMPTZ,
  session_end_time TIMESTAMPTZ,
  is_session_active BOOLEAN DEFAULT FALSE,
  conversation_cost_cents INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, whatsapp_contact_id)
);

-- WhatsApp messages log
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_id VARCHAR(100), -- WhatsApp message ID
  direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
  message_type VARCHAR(20) NOT NULL, -- 'text', 'image', 'document', 'audio', 'video', 'location', 'template'
  content JSONB NOT NULL, -- Message content structure
  media_url VARCHAR(500),
  media_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  error_code VARCHAR(10),
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp media storage
CREATE TABLE whatsapp_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  media_id VARCHAR(100) NOT NULL, -- WhatsApp media ID
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  media_url VARCHAR(500),
  local_file_path VARCHAR(500),
  uploaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_downloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(media_id)
);

-- WhatsApp business profile settings
CREATE TABLE whatsapp_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  business_name VARCHAR(100) NOT NULL,
  business_description TEXT,
  business_address TEXT,
  business_email VARCHAR(100),
  business_website VARCHAR(255),
  profile_picture_url VARCHAR(500),
  industry VARCHAR(50),
  business_hours JSONB DEFAULT '{}',
  auto_replies JSONB DEFAULT '{}',
  greeting_message TEXT,
  away_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id)
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id, timestamp);
CREATE INDEX idx_whatsapp_messages_supplier_date ON whatsapp_messages(supplier_id, timestamp);
CREATE INDEX idx_whatsapp_conversations_client ON whatsapp_conversations(client_id);
CREATE INDEX idx_whatsapp_conversations_active_session ON whatsapp_conversations(supplier_id, is_session_active) WHERE is_session_active = TRUE;
CREATE INDEX idx_whatsapp_templates_supplier_status ON whatsapp_templates(supplier_id, status);
CREATE INDEX idx_whatsapp_media_expires ON whatsapp_media(expires_at) WHERE expires_at IS NOT NULL;
```

## API Endpoints

```typescript
// WhatsApp data types
interface WhatsAppConfig {
  id: string;
  supplierId: string;
  businessId: string;
  phoneNumberId: string;
  phoneNumber: string;
  apiVersion: string;
  isVerified: boolean;
  isActive: boolean;
  businessProfile: WhatsAppBusinessProfile;
  messagingLimits: {
    tier: string;
    maxRecipients24h: number;
    currentUsage: number;
  };
  updatedAt: string;
}

interface WhatsAppBusinessProfile {
  businessName: string;
  businessDescription?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessWebsite?: string;
  profilePictureUrl?: string;
  industry?: string;
  businessHours?: BusinessHours;
  autoReplies?: AutoReplies;
  greetingMessage?: string;
  awayMessage?: string;
}

interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

interface AutoReplies {
  enabled: boolean;
  keywords: KeywordReply[];
  defaultReply?: string;
}

interface KeywordReply {
  keywords: string[];
  reply: string;
  isActive: boolean;
}

interface WhatsAppTemplate {
  id: string;
  supplierId: string;
  templateName: string;
  templateId: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  status: 'pending' | 'approved' | 'rejected';
  components: TemplateComponent[];
  variables: string[];
  usageCount: number;
  createdAt: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

interface WhatsAppMessage {
  id: string;
  supplierId: string;
  conversationId: string;
  clientId: string;
  messageId?: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'template';
  content: MessageContent;
  mediaUrl?: string;
  mediaType?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  costCents?: number;
}

interface MessageContent {
  text?: string;
  media?: {
    id: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  template?: {
    name: string;
    language: string;
    components: any[];
  };
}

interface WhatsAppConversation {
  id: string;
  supplierId: string;
  clientId: string;
  whatsappContactId: string;
  phoneNumber: string;
  contactName?: string;
  conversationCategory: 'service' | 'marketing' | 'authentication';
  sessionStartTime?: string;
  sessionEndTime?: string;
  isSessionActive: boolean;
  conversationCostCents: number;
  messageCount: number;
  lastMessageTime?: string;
  recentMessages: WhatsAppMessage[];
}

// API Routes
// POST /api/whatsapp/config
interface CreateWhatsAppConfigRequest {
  businessId: string;
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessProfile: Partial<WhatsAppBusinessProfile>;
}

interface CreateWhatsAppConfigResponse {
  success: boolean;
  data: WhatsAppConfig;
}

// GET /api/whatsapp/config
interface GetWhatsAppConfigResponse {
  success: boolean;
  data: WhatsAppConfig | null;
}

// POST /api/whatsapp/templates
interface CreateWhatsAppTemplateRequest {
  templateName: string;
  category: string;
  language: string;
  components: TemplateComponent[];
}

interface CreateWhatsAppTemplateResponse {
  success: boolean;
  data: {
    templateId: string;
    status: string;
    message: string;
  };
}

// GET /api/whatsapp/templates
interface GetWhatsAppTemplatesResponse {
  success: boolean;
  data: WhatsAppTemplate[];
}

// POST /api/whatsapp/send
interface SendWhatsAppMessageRequest {
  clientId: string;
  messageType: 'text' | 'template' | 'media';
  content: {
    text?: string;
    templateName?: string;
    templateVariables?: Record<string, string>;
    mediaId?: string;
    caption?: string;
  };
  recipientPhoneNumber: string;
}

interface SendWhatsAppMessageResponse {
  success: boolean;
  data: {
    messageId: string;
    conversationId: string;
    status: string;
    costEstimate: number;
  };
}

// GET /api/whatsapp/conversations
interface GetWhatsAppConversationsRequest {
  clientId?: string;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface GetWhatsAppConversationsResponse {
  success: boolean;
  data: WhatsAppConversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/whatsapp/webhook
interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

interface WhatsAppWebhookChange {
  field: string;
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: any[];
    messages?: any[];
    statuses?: any[];
  };
}

// POST /api/whatsapp/media/upload
interface UploadMediaRequest {
  file: File;
  type: 'image' | 'document' | 'audio' | 'video';
}

interface UploadMediaResponse {
  success: boolean;
  data: {
    mediaId: string;
    mediaUrl: string;
  };
}
```

## Frontend Components

```typescript
// WhatsAppDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WhatsAppDashboardProps {
  supplierId: string;
}

export const WhatsAppDashboard: React.FC<WhatsAppDashboardProps> = ({ supplierId }) => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhatsAppConfig();
    loadConversations();
    loadTemplates();
  }, [supplierId]);

  const loadWhatsAppConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/config');
      const data = await response.json();
      setConfig(data.data);
    } catch (error) {
      console.error('Failed to load WhatsApp config:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/whatsapp/conversations?limit=10');
      const data = await response.json();
      setConversations(data.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/whatsapp/templates');
      const data = await response.json();
      setTemplates(data.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading WhatsApp configuration...</div>;

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            WhatsApp Business Configuration
            <div className="flex gap-2">
              <Badge variant={config?.isVerified ? 'default' : 'secondary'}>
                {config?.isVerified ? 'Verified' : 'Unverified'}
              </Badge>
              <Badge variant={config?.isActive ? 'default' : 'secondary'}>
                {config?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <WhatsAppConfigView config={config} onUpdate={loadWhatsAppConfig} />
          ) : (
            <WhatsAppSetupWizard onComplete={loadWhatsAppConfig} />
          )}
        </CardContent>
      </Card>

      {config && (
        <Tabs defaultValue="conversations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <WhatsAppConversationsView 
              conversations={conversations}
              onRefresh={loadConversations}
            />
          </TabsContent>

          <TabsContent value="templates">
            <WhatsAppTemplatesView 
              templates={templates}
              onRefresh={loadTemplates}
            />
          </TabsContent>

          <TabsContent value="media">
            <WhatsAppMediaManager supplierId={supplierId} />
          </TabsContent>

          <TabsContent value="analytics">
            <WhatsAppAnalytics supplierId={supplierId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// WhatsAppConversationView.tsx
interface WhatsAppConversationViewProps {
  conversation: WhatsAppConversation;
  onSendMessage: (content: any) => void;
}

export const WhatsAppConversationView: React.FC<WhatsAppConversationViewProps> = ({
  conversation,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [messageType, setMessageType] = useState<'text' | 'media' | 'template'>('text');

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedMedia) return;

    const content: any = {};

    switch (messageType) {
      case 'text':
        content.text = newMessage;
        break;
      case 'media':
        if (selectedMedia) {
          const mediaId = await uploadMedia(selectedMedia);
          content.mediaId = mediaId;
          content.caption = newMessage;
        }
        break;
      case 'template':
        // Handle template selection
        break;
    }

    await onSendMessage(content);
    setNewMessage('');
    setSelectedMedia(null);
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type.startsWith('image/') ? 'image' : 'document');

    const response = await fetch('/api/whatsapp/media/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return data.data.mediaId;
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Conversation Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{conversation.contactName || conversation.phoneNumber}</h3>
            <p className="text-sm text-gray-500">
              {conversation.isSessionActive ? (
                <span className="text-green-600">• Active session</span>
              ) : (
                'Session ended'
              )}
            </p>
          </div>
          <Badge variant="outline">
            {conversation.conversationCategory}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.recentMessages.map((message) => (
          <WhatsAppMessageBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setMessageType('text')}
            className={`px-3 py-1 rounded text-sm ${
              messageType === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setMessageType('media')}
            className={`px-3 py-1 rounded text-sm ${
              messageType === 'media' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setMessageType('template')}
            className={`px-3 py-1 rounded text-sm ${
              messageType === 'template' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
            }`}
          >
            Template
          </button>
        </div>

        <div className="flex gap-2">
          {messageType === 'media' && (
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => setSelectedMedia(e.target.files?.[0] || null)}
              className="flex-1"
            />
          )}
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              messageType === 'media' ? 'Caption (optional)' : 'Type a message...'
            }
            className="flex-1 p-2 border rounded-md"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          
          <Button onClick={handleSendMessage}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

// WhatsAppMessageBubble.tsx
interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
}

export const WhatsAppMessageBubble: React.FC<WhatsAppMessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[70%] rounded-lg p-3 
        ${isOutbound 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-900'
        }
      `}>
        {/* Message Content */}
        {message.messageType === 'text' && (
          <p className="whitespace-pre-wrap">{message.content.text}</p>
        )}

        {message.messageType === 'image' && (
          <div>
            <img 
              src={message.mediaUrl} 
              alt="Shared image" 
              className="max-w-full rounded mb-2"
            />
            {message.content.media?.caption && (
              <p className="text-sm">{message.content.media.caption}</p>
            )}
          </div>
        )}

        {message.messageType === 'document' && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
              📄
            </div>
            <div>
              <p className="text-sm font-medium">
                {message.content.media?.filename || 'Document'}
              </p>
              <a 
                href={message.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs underline"
              >
                Download
              </a>
            </div>
          </div>
        )}

        {message.messageType === 'location' && (
          <div>
            <p className="text-sm font-medium">📍 Location shared</p>
            {message.content.location?.name && (
              <p className="text-sm">{message.content.location.name}</p>
            )}
            {message.content.location?.address && (
              <p className="text-xs opacity-75">{message.content.location.address}</p>
            )}
          </div>
        )}

        {message.messageType === 'template' && (
          <div>
            <p className="text-xs opacity-75 mb-1">Template Message</p>
            <p>{message.content.text}</p>
          </div>
        )}

        {/* Message Status and Time */}
        <div className="flex justify-between items-center mt-2 text-xs">
          <span className="opacity-75">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {isOutbound && (
            <span className="opacity-75">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
              {message.status === 'failed' && '✗'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// WhatsAppTemplateEditor.tsx
interface WhatsAppTemplateEditorProps {
  template?: WhatsAppTemplate;
  onSave: (template: any) => void;
  onCancel: () => void;
}

export const WhatsAppTemplateEditor: React.FC<WhatsAppTemplateEditorProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    templateName: template?.templateName || '',
    category: template?.category || 'UTILITY',
    language: template?.language || 'en_US',
    components: template?.components || [
      {
        type: 'BODY',
        text: ''
      }
    ]
  });

  const addComponent = (type: string) => {
    setFormData({
      ...formData,
      components: [...formData.components, { type, text: '' }]
    });
  };

  const updateComponent = (index: number, updates: any) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setFormData({ ...formData, components: newComponents });
  };

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Basic Info */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <input
            type="text"
            value={formData.templateName}
            onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
            className="w-full p-2 border rounded-md"
            placeholder="e.g., booking_confirmation"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="UTILITY">Utility</option>
            <option value="MARKETING">Marketing</option>
            <option value="AUTHENTICATION">Authentication</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="en_US">English (US)</option>
            <option value="es_ES">Spanish</option>
            <option value="fr_FR">French</option>
          </select>
        </div>
      </div>

      {/* Template Components */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Template Components</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addComponent('HEADER')}>
              Add Header
            </Button>
            <Button size="sm" variant="outline" onClick={() => addComponent('FOOTER')}>
              Add Footer
            </Button>
            <Button size="sm" variant="outline" onClick={() => addComponent('BUTTONS')}>
              Add Buttons
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {formData.components.map((component, index) => (
            <WhatsAppTemplateComponent
              key={index}
              component={component}
              index={index}
              onUpdate={(updates) => updateComponent(index, updates)}
              onRemove={() => removeComponent(index)}
            />
          ))}
        </div>
      </div>

      {/* Template Preview */}
      <div>
        <h3 className="text-lg font-medium mb-2">Preview</h3>
        <div className="border rounded-lg p-4 bg-gray-50">
          <WhatsAppTemplatePreview components={formData.components} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          Submit for Approval
        </Button>
      </div>
    </div>
  );
};
```

## Code Examples

### WhatsApp Service Implementation

```typescript
// lib/services/whatsapp-service.ts
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export class WhatsAppService {
  private baseURL = 'https://graph.facebook.com/v18.0';
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async sendMessage(request: SendWhatsAppMessageRequest): Promise<any> {
    const config = await this.getWhatsAppConfig(request.supplierId);
    if (!config || !config.isActive) {
      throw new Error('WhatsApp not configured or inactive');
    }

    const conversation = await this.getOrCreateConversation(
      request.supplierId,
      request.clientId,
      request.recipientPhoneNumber
    );

    // Check if we're within the 24-hour messaging window
    const canSendDirectly = await this.canSendDirectMessage(conversation);
    
    if (!canSendDirectly && request.messageType !== 'template') {
      throw new Error('Can only send template messages outside 24-hour window');
    }

    const messagePayload = await this.buildMessagePayload(request, config);
    
    try {
      const response = await axios.post(
        `${this.baseURL}/${config.phoneNumberId}/messages`,
        messagePayload,
        {
          headers: {
            'Authorization': `Bearer ${await this.decryptAccessToken(config.accessTokenEncrypted)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the message
      const messageRecord = await this.logMessage({
        supplierId: request.supplierId,
        conversationId: conversation.id,
        clientId: request.clientId,
        messageId: response.data.messages[0].id,
        direction: 'outbound',
        messageType: request.messageType,
        content: request.content,
        status: 'sent'
      });

      // Update conversation session
      await this.updateConversationSession(conversation.id);

      return {
        messageId: response.data.messages[0].id,
        conversationId: conversation.id,
        status: 'sent',
        costEstimate: await this.calculateMessageCost(request.messageType, conversation.conversationCategory)
      };

    } catch (error) {
      console.error('WhatsApp API error:', error.response?.data);
      throw new Error(`Failed to send WhatsApp message: ${error.response?.data?.error?.message}`);
    }
  }

  private async buildMessagePayload(request: SendWhatsAppMessageRequest, config: WhatsAppConfig): Promise<any> {
    const payload: any = {
      messaging_product: 'whatsapp',
      to: request.recipientPhoneNumber
    };

    switch (request.messageType) {
      case 'text':
        payload.type = 'text';
        payload.text = { body: request.content.text };
        break;

      case 'template':
        payload.type = 'template';
        payload.template = {
          name: request.content.templateName,
          language: { code: 'en_US' },
          components: await this.buildTemplateComponents(request.content.templateVariables)
        };
        break;

      case 'media':
        if (request.content.mediaId) {
          const mediaType = await this.getMediaType(request.content.mediaId);
          payload.type = mediaType;
          payload[mediaType] = {
            id: request.content.mediaId
          };
          if (request.content.caption) {
            payload[mediaType].caption = request.content.caption;
          }
        }
        break;
    }

    return payload;
  }

  async handleWebhook(webhookData: WhatsAppWebhookPayload): Promise<void> {
    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          await this.processWebhookMessages(change.value);
        }
      }
    }
  }

  private async processWebhookMessages(value: any): Promise<void> {
    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await this.processIncomingMessage(message, value.metadata);
      }
    }

    // Process message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await this.processMessageStatus(status);
      }
    }
  }

  private async processIncomingMessage(message: any, metadata: any): Promise<void> {
    const phoneNumberId = metadata.phone_number_id;
    const config = await this.getConfigByPhoneNumberId(phoneNumberId);
    
    if (!config) return;

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(
      config.supplierId,
      null, // Will be resolved from phone number
      message.from
    );

    // Determine message type and extract content
    const messageType = message.type;
    let content: any = {};

    switch (messageType) {
      case 'text':
        content.text = message.text.body;
        break;
      case 'image':
      case 'document':
      case 'audio':
      case 'video':
        content.media = {
          id: message[messageType].id,
          filename: message[messageType].filename,
          caption: message[messageType].caption
        };
        // Download and store media
        await this.downloadAndStoreMedia(message[messageType].id, config);
        break;
      case 'location':
        content.location = {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          name: message.location.name,
          address: message.location.address
        };
        break;
    }

    // Log the incoming message
    await this.logMessage({
      supplierId: config.supplierId,
      conversationId: conversation.id,
      clientId: conversation.clientId,
      messageId: message.id,
      direction: 'inbound',
      messageType,
      content,
      status: 'received',
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
    });

    // Update conversation session
    await this.updateConversationSession(conversation.id, true);

    // Process auto-replies if configured
    await this.processAutoReplies(conversation, content, config);
  }

  private async processMessageStatus(status: any): Promise<void> {
    await this.supabase
      .from('whatsapp_messages')
      .update({
        status: status.status,
        updatedAt: new Date().toISOString()
      })
      .eq('message_id', status.id);
  }

  async createTemplate(request: CreateWhatsAppTemplateRequest): Promise<any> {
    const config = await this.getWhatsAppConfig(request.supplierId);
    if (!config) {
      throw new Error('WhatsApp not configured');
    }

    const templatePayload = {
      name: request.templateName,
      category: request.category,
      language: request.language,
      components: request.components
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/${config.businessId}/message_templates`,
        templatePayload,
        {
          headers: {
            'Authorization': `Bearer ${await this.decryptAccessToken(config.accessTokenEncrypted)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Store template in database
      await this.supabase
        .from('whatsapp_templates')
        .insert({
          supplier_id: request.supplierId,
          template_name: request.templateName,
          template_id: response.data.id,
          category: request.category,
          language: request.language,
          status: 'pending',
          components: request.components
        });

      return {
        templateId: response.data.id,
        status: response.data.status,
        message: 'Template submitted for approval'
      };

    } catch (error) {
      console.error('Template creation error:', error.response?.data);
      throw new Error(`Failed to create template: ${error.response?.data?.error?.message}`);
    }
  }

  async uploadMedia(file: Buffer, mimeType: string, filename: string, config: WhatsAppConfig): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([file], { type: mimeType }), filename);
    formData.append('type', mimeType);
    formData.append('messaging_product', 'whatsapp');

    try {
      const response = await axios.post(
        `${this.baseURL}/${config.phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${await this.decryptAccessToken(config.accessTokenEncrypted)}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Store media reference
      await this.supabase
        .from('whatsapp_media')
        .insert({
          supplier_id: config.supplierId,
          media_id: response.data.id,
          file_name: filename,
          mime_type: mimeType,
          file_size: file.length,
          uploaded_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      return response.data.id;

    } catch (error) {
      console.error('Media upload error:', error.response?.data);
      throw new Error(`Failed to upload media: ${error.response?.data?.error?.message}`);
    }
  }

  private async canSendDirectMessage(conversation: WhatsAppConversation): Promise<boolean> {
    if (!conversation.lastMessageTime) return false;
    
    const lastMessageTime = new Date(conversation.lastMessageTime);
    const now = new Date();
    const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastMessage < 24;
  }

  private async calculateMessageCost(messageType: string, conversationCategory: string): Promise<number> {
    // WhatsApp pricing (in cents)
    const pricing = {
      service: 0.5, // $0.005
      marketing: 1.0, // $0.01
      authentication: 0.5 // $0.005
    };

    return pricing[conversationCategory] || pricing.service;
  }

  private async processAutoReplies(
    conversation: WhatsAppConversation, 
    content: any, 
    config: WhatsAppConfig
  ): Promise<void> {
    const profile = await this.getBusinessProfile(config.supplierId);
    
    if (!profile?.autoReplies?.enabled || !content.text) return;

    // Check for keyword matches
    for (const keywordReply of profile.autoReplies.keywords) {
      if (!keywordReply.isActive) continue;
      
      const messageText = content.text.toLowerCase();
      const hasKeyword = keywordReply.keywords.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        await this.sendAutoReply(conversation, keywordReply.reply, config);
        return;
      }
    }

    // Send default auto-reply if configured and no keyword match
    if (profile.autoReplies.defaultReply) {
      await this.sendAutoReply(conversation, profile.autoReplies.defaultReply, config);
    }
  }

  private async sendAutoReply(
    conversation: WhatsAppConversation, 
    replyText: string, 
    config: WhatsAppConfig
  ): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      to: conversation.phoneNumber,
      type: 'text',
      text: { body: replyText }
    };

    try {
      await axios.post(
        `${this.baseURL}/${config.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${await this.decryptAccessToken(config.accessTokenEncrypted)}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Auto-reply failed:', error);
    }
  }
}
```

## Test Requirements

```typescript
// __tests__/whatsapp-setup.test.ts
import { WhatsAppService } from '@/lib/services/whatsapp-service';

describe('WhatsApp Setup', () => {
  let whatsappService: WhatsAppService;

  beforeEach(() => {
    whatsappService = new WhatsAppService();
  });

  describe('Message Sending', () => {
    it('should send text message successfully', async () => {
      const request = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        messageType: 'text' as const,
        content: { text: 'Hello from WedSync!' },
        recipientPhoneNumber: '+1234567890'
      };

      const result = await whatsappService.sendMessage(request);

      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.conversationId).toBeDefined();
    });

    it('should require template for messages outside 24h window', async () => {
      const request = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        messageType: 'text' as const,
        content: { text: 'Marketing message' },
        recipientPhoneNumber: '+1234567890'
      };

      // Mock conversation with old last message
      jest.spyOn(whatsappService, 'canSendDirectMessage').mockResolvedValue(false);

      await expect(whatsappService.sendMessage(request)).rejects.toThrow(
        'Can only send template messages outside 24-hour window'
      );
    });

    it('should send template message correctly', async () => {
      const request = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        messageType: 'template' as const,
        content: {
          templateName: 'booking_confirmation',
          templateVariables: {
            client_name: 'John Doe',
            date: 'June 15, 2024'
          }
        },
        recipientPhoneNumber: '+1234567890'
      };

      const result = await whatsappService.sendMessage(request);

      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('Media Handling', () => {
    it('should upload media successfully', async () => {
      const fileBuffer = Buffer.from('fake image data');
      const config = {
        supplierId: 'supplier-1',
        phoneNumberId: 'phone-123',
        accessTokenEncrypted: 'encrypted-token'
      };

      const mediaId = await whatsappService.uploadMedia(
        fileBuffer,
        'image/jpeg',
        'test-image.jpg',
        config
      );

      expect(mediaId).toBeDefined();
      expect(typeof mediaId).toBe('string');
    });

    it('should send media message with caption', async () => {
      const request = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        messageType: 'media' as const,
        content: {
          mediaId: 'media-123',
          caption: 'Here are the venue photos!'
        },
        recipientPhoneNumber: '+1234567890'
      };

      const result = await whatsappService.sendMessage(request);

      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('Webhook Processing', () => {
    it('should process incoming text message', async () => {
      const webhookData = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: 'phone-123'
              },
              messages: [{
                id: 'message-123',
                from: '+0987654321',
                timestamp: '1671234567',
                type: 'text',
                text: {
                  body: 'Hello, I have a question about my wedding'
                }
              }]
            }
          }]
        }]
      };

      await whatsappService.handleWebhook(webhookData);

      // Verify message was logged in database
      // This would require database mocking or test database
    });

    it('should process message status updates', async () => {
      const webhookData = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: 'phone-123'
              },
              statuses: [{
                id: 'message-123',
                status: 'delivered',
                timestamp: '1671234567',
                recipient_id: '+0987654321'
              }]
            }
          }]
        }]
      };

      await whatsappService.handleWebhook(webhookData);

      // Verify status was updated in database
    });
  });

  describe('Template Management', () => {
    it('should create template successfully', async () => {
      const request = {
        supplierId: 'supplier-1',
        templateName: 'booking_reminder',
        category: 'UTILITY',
        language: 'en_US',
        components: [
          {
            type: 'BODY',
            text: 'Hi {{1}}, your wedding photography session is scheduled for {{2}}. Please confirm your attendance.'
          }
        ]
      };

      const result = await whatsappService.createTemplate(request);

      expect(result.templateId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should validate template components', () => {
      const components = [
        { type: 'HEADER', text: 'Wedding Reminder' },
        { type: 'BODY', text: 'Hi {{1}}, your session is on {{2}}' },
        { type: 'FOOTER', text: 'Reply STOP to opt out' }
      ];

      const isValid = whatsappService.validateTemplateComponents(components);
      expect(isValid).toBe(true);
    });
  });

  describe('Auto-Replies', () => {
    it('should send auto-reply for keyword match', async () => {
      const conversation = {
        id: 'conv-123',
        phoneNumber: '+1234567890',
        supplierId: 'supplier-1'
      };

      const content = { text: 'What are your hours?' };
      const config = { supplierId: 'supplier-1' };

      // Mock business profile with auto-replies
      jest.spyOn(whatsappService, 'getBusinessProfile').mockResolvedValue({
        autoReplies: {
          enabled: true,
          keywords: [{
            keywords: ['hours', 'open', 'closed'],
            reply: 'We are open Monday-Friday 9AM-5PM. Contact us for weekend appointments!',
            isActive: true
          }]
        }
      });

      await whatsappService.processAutoReplies(conversation, content, config);

      // Verify auto-reply was sent
      // This would require mocking the WhatsApp API call
    });
  });

  describe('Session Management', () => {
    it('should track 24-hour messaging window correctly', async () => {
      const conversation = {
        lastMessageTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() // 23 hours ago
      };

      const canSend = await whatsappService.canSendDirectMessage(conversation);
      expect(canSend).toBe(true);
    });

    it('should require template outside 24-hour window', async () => {
      const conversation = {
        lastMessageTime: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };

      const canSend = await whatsappService.canSendDirectMessage(conversation);
      expect(canSend).toBe(false);
    });
  });
});
```

## Dependencies

### External Services
- **WhatsApp Business API**: Core messaging platform
- **Facebook Graph API**: Template management
- **Cloud Storage**: Media file storage

### Internal Dependencies
- **Supabase Database**: Configuration and message storage
- **File Upload Service**: Media handling
- **Encryption Service**: Secure token storage
- **Webhook Handler**: Real-time message processing

### Frontend Dependencies
- **React**: UI framework
- **Axios**: HTTP client
- **React Query**: API state management
- **Shadcn/ui**: UI components

## Effort Estimate

- **Database Schema**: 8 hours
- **WhatsApp API Integration**: 16 hours
- **Template Management**: 12 hours
- **Media Upload/Download**: 10 hours
- **Webhook Processing**: 12 hours
- **Frontend Components**: 24 hours
- **Session Management**: 8 hours
- **Auto-Reply System**: 8 hours
- **Testing**: 20 hours
- **Documentation**: 6 hours

**Total Estimated Effort**: 124 hours (15.5 days)

## Success Metrics

- 99% message delivery rate
- Template approval rate > 90%
- Media upload success rate > 95%
- Average response time < 2 minutes
- Session tracking accuracy 100%
- 85% user satisfaction with WhatsApp features