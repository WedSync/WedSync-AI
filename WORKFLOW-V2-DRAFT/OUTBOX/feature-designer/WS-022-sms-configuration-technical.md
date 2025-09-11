# WS-022: SMS Configuration - Technical Specification

## User Story

**As a wedding photographer**, I need to configure SMS messaging with templates and compliance settings so I can send quick updates to clients about shoot schedules and delivery timelines.

**Real Wedding Scenario**: David, a photographer, receives a weather alert about rain during an outdoor engagement session. He quickly selects his "Weather Update" SMS template, customizes it with the new indoor location details, and sends it to the couple with delivery confirmation. The couple receives the update immediately and adjusts their plans, keeping the session on schedule.

## Database Schema

```sql
-- SMS provider configuration
CREATE TABLE sms_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'twilio',
  account_sid VARCHAR(100) NOT NULL,
  auth_token_encrypted TEXT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  messaging_service_sid VARCHAR(100),
  status_callback_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, provider)
);

-- SMS message templates
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- 'booking', 'reminder', 'update', 'thank_you'
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Array of merge field names
  character_count INTEGER GENERATED ALWAYS AS (LENGTH(content)) STORED,
  segment_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS message log
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  provider_message_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  error_code VARCHAR(10),
  error_message TEXT,
  segments INTEGER DEFAULT 1,
  cost_cents INTEGER,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS compliance tracking
CREATE TABLE sms_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  opt_in_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'opted_in', 'opted_out'
  opt_in_date TIMESTAMPTZ,
  opt_out_date TIMESTAMPTZ,
  opt_in_method VARCHAR(50), -- 'manual', 'form', 'reply', 'call'
  compliance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, phone_number)
);

-- SMS usage tracking
CREATE TABLE sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  billing_period DATE NOT NULL, -- First day of billing month
  messages_sent INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  message_breakdown JSONB DEFAULT '{}', -- By country/type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, billing_period)
);

-- Indexes for performance
CREATE INDEX idx_sms_messages_supplier_status ON sms_messages(supplier_id, status);
CREATE INDEX idx_sms_messages_client_date ON sms_messages(client_id, sent_at);
CREATE INDEX idx_sms_compliance_phone ON sms_compliance(phone_number);
CREATE INDEX idx_sms_templates_supplier_category ON sms_templates(supplier_id, category, is_active);
CREATE INDEX idx_sms_usage_supplier_period ON sms_usage(supplier_id, billing_period);

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL AND NEW.status = 'sent' THEN
    UPDATE sms_templates 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template usage
CREATE TRIGGER trigger_update_template_usage
  AFTER UPDATE ON sms_messages
  FOR EACH ROW
  WHEN (OLD.status != 'sent' AND NEW.status = 'sent')
  EXECUTE FUNCTION update_template_usage();
```

## API Endpoints

```typescript
// SMS configuration types
interface SMSConfig {
  id: string;
  supplierId: string;
  provider: 'twilio' | 'messagebird' | 'plivo';
  accountSid: string;
  phoneNumber: string;
  messagingServiceSid?: string;
  statusCallbackUrl?: string;
  isActive: boolean;
  configuration: {
    timeZone: string;
    sendingHours: { start: string; end: string };
    weekendSending: boolean;
    holidaySending: boolean;
  };
  updatedAt: string;
}

interface SMSTemplate {
  id: string;
  supplierId: string;
  name: string;
  category: 'booking' | 'reminder' | 'update' | 'thank_you';
  content: string;
  variables: string[];
  characterCount: number;
  segmentCount: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SMSMessage {
  id: string;
  supplierId: string;
  clientId: string;
  templateId?: string;
  toNumber: string;
  fromNumber: string;
  content: string;
  providerMessageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
  errorMessage?: string;
  segments: number;
  costCents?: number;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

interface SMSCompliance {
  id: string;
  supplierId: string;
  clientId: string;
  phoneNumber: string;
  optInStatus: 'pending' | 'opted_in' | 'opted_out';
  optInDate?: string;
  optOutDate?: string;
  optInMethod?: 'manual' | 'form' | 'reply' | 'call';
  complianceNotes?: string;
}

interface SMSUsage {
  supplierId: string;
  billingPeriod: string;
  messagesSent: number;
  totalCostCents: number;
  messageBreakdown: {
    domestic: number;
    international: number;
    byCountry: Record<string, number>;
  };
}

// API Routes
// POST /api/sms/config
interface CreateSMSConfigRequest {
  provider: string;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  messagingServiceSid?: string;
  configuration: any;
}

interface CreateSMSConfigResponse {
  success: boolean;
  data: SMSConfig;
}

// GET /api/sms/config
interface GetSMSConfigResponse {
  success: boolean;
  data: SMSConfig | null;
}

// PUT /api/sms/config/:id
interface UpdateSMSConfigRequest {
  phoneNumber?: string;
  messagingServiceSid?: string;
  isActive?: boolean;
  configuration?: any;
}

interface UpdateSMSConfigResponse {
  success: boolean;
  data: SMSConfig;
}

// POST /api/sms/templates
interface CreateSMSTemplateRequest {
  name: string;
  category: string;
  content: string;
  variables?: string[];
}

interface CreateSMSTemplateResponse {
  success: boolean;
  data: SMSTemplate;
}

// GET /api/sms/templates
interface GetSMSTemplatesResponse {
  success: boolean;
  data: SMSTemplate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/sms/send
interface SendSMSRequest {
  clientId: string;
  templateId?: string;
  content: string;
  phoneNumber: string;
  variables?: Record<string, string>;
  scheduledFor?: string;
}

interface SendSMSResponse {
  success: boolean;
  data: {
    messageId: string;
    segments: number;
    estimatedCost: number;
    status: string;
  };
}

// GET /api/sms/messages
interface GetSMSMessagesRequest {
  clientId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface GetSMSMessagesResponse {
  success: boolean;
  data: SMSMessage[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/sms/compliance/opt-in
interface SMSOptInRequest {
  clientId: string;
  phoneNumber: string;
  method: string;
  notes?: string;
}

interface SMSOptInResponse {
  success: boolean;
  data: SMSCompliance;
}

// GET /api/sms/usage
interface GetSMSUsageRequest {
  fromDate?: string;
  toDate?: string;
}

interface GetSMSUsageResponse {
  success: boolean;
  data: SMSUsage[];
}
```

## Frontend Components

```typescript
// SMSConfigurationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SMSConfigurationDashboardProps {
  supplierId: string;
}

export const SMSConfigurationDashboard: React.FC<SMSConfigurationDashboardProps> = ({
  supplierId
}) => {
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [usage, setUsage] = useState<SMSUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    loadSMSConfiguration();
    loadSMSTemplates();
    loadSMSUsage();
  }, [supplierId]);

  const loadSMSConfiguration = async () => {
    try {
      const response = await fetch('/api/sms/config');
      const data = await response.json();
      setConfig(data.data);
    } catch (error) {
      console.error('Failed to load SMS configuration:', error);
    }
  };

  const loadSMSTemplates = async () => {
    try {
      const response = await fetch('/api/sms/templates');
      const data = await response.json();
      setTemplates(data.data);
    } catch (error) {
      console.error('Failed to load SMS templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSMSUsage = async () => {
    try {
      const response = await fetch('/api/sms/usage');
      const data = await response.json();
      setUsage(data.data[0]);
    } catch (error) {
      console.error('Failed to load SMS usage:', error);
    }
  };

  const sendTestMessage = async () => {
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: config?.phoneNumber,
          content: testMessage,
          clientId: 'test'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Test message sent successfully!');
        setTestMessage('');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      alert('Failed to send test message');
    }
  };

  if (loading) return <div>Loading SMS configuration...</div>;

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            SMS Configuration
            <Badge variant={config?.isActive ? 'default' : 'secondary'}>
              {config?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium">{config.provider.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{config.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account SID</p>
                  <p className="font-mono text-sm">{config.accountSid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status Callback</p>
                  <p className="text-sm">{config.statusCallbackUrl || 'Not configured'}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <SMSConfigurationForm config={config} onUpdate={loadSMSConfiguration} />
              </div>
            </div>
          ) : (
            <SMSSetupWizard onComplete={loadSMSConfiguration} />
          )}
        </CardContent>
      </Card>

      {/* Usage Dashboard */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{usage.messagesSent}</p>
                <p className="text-sm text-gray-500">Messages Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${(usage.totalCostCents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Total Cost</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  ${usage.messagesSent > 0 ? ((usage.totalCostCents / usage.messagesSent) / 100).toFixed(3) : '0.000'}
                </p>
                <p className="text-sm text-gray-500">Cost per Message</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            SMS Templates
            <Button onClick={() => setShowTemplateForm(true)}>
              Add Template
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SMSTemplatesManager 
            templates={templates} 
            onUpdate={loadSMSTemplates}
          />
        </CardContent>
      </Card>

      {/* Test Messaging */}
      {config?.isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Test Message</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {testMessage.length} characters • {Math.ceil(testMessage.length / 160)} segments
                </p>
                <Button 
                  onClick={sendTestMessage}
                  disabled={!testMessage.trim()}
                >
                  Send Test Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// SMSTemplateEditor.tsx
interface SMSTemplateEditorProps {
  template?: SMSTemplate;
  onSave: (template: Partial<SMSTemplate>) => void;
  onCancel: () => void;
}

export const SMSTemplateEditor: React.FC<SMSTemplateEditorProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'update',
    content: template?.content || '',
    variables: template?.variables || []
  });

  const [characterCount, setCharacterCount] = useState(0);
  const [segmentCount, setSegmentCount] = useState(1);

  useEffect(() => {
    const count = formData.content.length;
    setCharacterCount(count);
    setSegmentCount(Math.ceil(count / 160) || 1);
  }, [formData.content]);

  const detectVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  };

  const handleContentChange = (content: string) => {
    const variables = detectVariables(content);
    setFormData({ ...formData, content, variables });
  };

  const handleSave = () => {
    onSave({
      ...formData,
      characterCount,
      segmentCount
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Weather Update"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="booking">Booking</option>
            <option value="reminder">Reminder</option>
            <option value="update">Update</option>
            <option value="thank_you">Thank You</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Hi {{client_name}}, your wedding photography session is confirmed for {{date}}..."
          className="min-h-[120px]"
        />
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <div>
            {characterCount} characters • {segmentCount} segments
            {segmentCount > 1 && (
              <span className="text-orange-600 ml-2">
                ⚠ Multiple segments increase cost
              </span>
            )}
          </div>
          <div>
            Cost: ${(segmentCount * 0.0075).toFixed(4)} per message
          </div>
        </div>
      </div>

      {formData.variables.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Available Variables</label>
          <div className="flex flex-wrap gap-2">
            {formData.variables.map((variable, index) => (
              <Badge key={index} variant="outline">
                {`{{${variable}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.name || !formData.content}>
          Save Template
        </Button>
      </div>
    </div>
  );
};

// SMSComplianceManager.tsx
interface SMSComplianceManagerProps {
  supplierId: string;
}

export const SMSComplianceManager: React.FC<SMSComplianceManagerProps> = ({
  supplierId
}) => {
  const [complianceRecords, setComplianceRecords] = useState<SMSCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceRecords();
  }, [supplierId]);

  const loadComplianceRecords = async () => {
    try {
      const response = await fetch('/api/sms/compliance');
      const data = await response.json();
      setComplianceRecords(data.data);
    } catch (error) {
      console.error('Failed to load compliance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async (clientId: string, phoneNumber: string) => {
    try {
      await fetch('/api/sms/compliance/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          phoneNumber,
          method: 'manual'
        })
      });
      loadComplianceRecords();
    } catch (error) {
      console.error('Failed to opt in client:', error);
    }
  };

  if (loading) return <div>Loading compliance records...</div>;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          SMS compliance is required by law. Always obtain explicit consent before sending marketing messages.
          Clients can opt out by replying STOP at any time.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {complianceRecords.map((record) => (
          <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{record.phoneNumber}</p>
              <p className="text-sm text-gray-500">
                {record.optInStatus === 'opted_in' 
                  ? `Opted in via ${record.optInMethod} on ${new Date(record.optInDate!).toLocaleDateString()}`
                  : record.optInStatus === 'opted_out'
                  ? `Opted out on ${new Date(record.optOutDate!).toLocaleDateString()}`
                  : 'Pending opt-in'
                }
              </p>
            </div>
            <Badge 
              variant={
                record.optInStatus === 'opted_in' ? 'default' :
                record.optInStatus === 'opted_out' ? 'destructive' : 'secondary'
              }
            >
              {record.optInStatus.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Code Examples

### SMS Service Implementation

```typescript
// lib/services/sms-service.ts
import { Twilio } from 'twilio';
import { createClient } from '@supabase/supabase-js';

export class SMSService {
  private twilioClient: Twilio;
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initializeTwilio(config: SMSConfig): Promise<void> {
    this.twilioClient = new Twilio(
      config.accountSid,
      await this.decryptToken(config.authTokenEncrypted)
    );
  }

  async sendSMS(request: SendSMSRequest): Promise<SMSMessage> {
    // Check compliance first
    const compliance = await this.checkCompliance(request.phoneNumber);
    if (compliance.optInStatus !== 'opted_in') {
      throw new Error('Recipient has not opted in to SMS messaging');
    }

    // Get configuration
    const config = await this.getSMSConfig(request.supplierId);
    if (!config || !config.isActive) {
      throw new Error('SMS not configured or inactive');
    }

    await this.initializeTwilio(config);

    // Process template and variables
    let content = request.content;
    if (request.templateId && request.variables) {
      const template = await this.getTemplate(request.templateId);
      content = this.processTemplate(template.content, request.variables);
    }

    // Calculate segments and cost
    const segments = Math.ceil(content.length / 160);
    const estimatedCost = await this.calculateCost(request.phoneNumber, segments);

    // Create message record
    const messageRecord = await this.createMessageRecord({
      supplierId: request.supplierId,
      clientId: request.clientId,
      templateId: request.templateId,
      toNumber: request.phoneNumber,
      fromNumber: config.phoneNumber,
      content,
      segments,
      costCents: estimatedCost
    });

    try {
      // Send via Twilio
      const message = await this.twilioClient.messages.create({
        body: content,
        from: config.phoneNumber,
        to: request.phoneNumber,
        statusCallback: config.statusCallbackUrl
      });

      // Update message record
      await this.updateMessageRecord(messageRecord.id, {
        providerMessageId: message.sid,
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      // Update usage tracking
      await this.updateUsageTracking(request.supplierId, segments, estimatedCost);

      return messageRecord;
    } catch (error) {
      // Update message record with error
      await this.updateMessageRecord(messageRecord.id, {
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }

  async processTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  async handleDeliveryWebhook(webhookData: any): Promise<void> {
    const { MessageSid, MessageStatus, ErrorCode } = webhookData;

    const message = await this.supabase
      .from('sms_messages')
      .select('*')
      .eq('provider_message_id', MessageSid)
      .single();

    if (message.data) {
      const updateData: any = {
        status: MessageStatus.toLowerCase(),
        updatedAt: new Date().toISOString()
      };

      if (MessageStatus === 'delivered') {
        updateData.deliveredAt = new Date().toISOString();
      }

      if (ErrorCode) {
        updateData.errorCode = ErrorCode;
      }

      await this.supabase
        .from('sms_messages')
        .update(updateData)
        .eq('id', message.data.id);
    }
  }

  async handleIncomingMessage(incomingData: any): Promise<void> {
    const { From, Body, MessageSid } = incomingData;

    // Check for STOP keywords
    const stopKeywords = ['STOP', 'QUIT', 'UNSUBSCRIBE', 'CANCEL', 'END'];
    const isOptOut = stopKeywords.some(keyword => 
      Body.trim().toUpperCase().includes(keyword)
    );

    if (isOptOut) {
      await this.handleOptOut(From);
      
      // Send confirmation
      await this.twilioClient.messages.create({
        body: 'You have been unsubscribed from SMS messages. Reply START to opt back in.',
        to: From,
        from: this.config.phoneNumber
      });
    }

    // Check for START keywords (opt back in)
    const startKeywords = ['START', 'YES', 'SUBSCRIBE'];
    const isOptIn = startKeywords.some(keyword => 
      Body.trim().toUpperCase().includes(keyword)
    );

    if (isOptIn) {
      await this.handleOptIn(From, 'reply');
      
      // Send confirmation
      await this.twilioClient.messages.create({
        body: 'You have been subscribed to SMS messages. Reply STOP to opt out.',
        to: From,
        from: this.config.phoneNumber
      });
    }

    // Log incoming message
    await this.logIncomingMessage({
      from: From,
      content: Body,
      providerMessageId: MessageSid,
      receivedAt: new Date().toISOString()
    });
  }

  private async handleOptOut(phoneNumber: string): Promise<void> {
    await this.supabase
      .from('sms_compliance')
      .update({
        optInStatus: 'opted_out',
        optOutDate: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber);
  }

  private async handleOptIn(phoneNumber: string, method: string): Promise<void> {
    await this.supabase
      .from('sms_compliance')
      .upsert({
        phoneNumber,
        optInStatus: 'opted_in',
        optInDate: new Date().toISOString(),
        optInMethod: method
      });
  }

  async calculateCost(phoneNumber: string, segments: number): Promise<number> {
    // Basic cost calculation (in cents)
    const baseRate = 0.75; // $0.0075 per segment for US numbers
    const isInternational = !phoneNumber.startsWith('+1');
    const rate = isInternational ? baseRate * 2 : baseRate;
    
    return Math.round(rate * segments);
  }

  async getUsageStats(supplierId: string, period: string): Promise<SMSUsage> {
    const { data } = await this.supabase
      .from('sms_usage')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('billing_period', period)
      .single();

    return data;
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    // Implement token decryption logic
    // This should use your encryption service
    return process.env.DECRYPTION_SERVICE!.decrypt(encryptedToken);
  }
}
```

### Character Count and Segmentation

```typescript
// lib/utils/sms-utils.ts
export interface SMSAnalysis {
  characterCount: number;
  segmentCount: number;
  encoding: 'GSM' | 'UCS2';
  maxLength: number;
  segments: SMSSegment[];
}

export interface SMSSegment {
  content: string;
  length: number;
  encoding: string;
}

export function analyzeSMSContent(content: string): SMSAnalysis {
  const hasUnicode = /[^\x00-\x7F]/.test(content);
  const encoding = hasUnicode ? 'UCS2' : 'GSM';
  
  // GSM: 160 chars for single, 153 for multipart
  // UCS2: 70 chars for single, 67 for multipart
  const singleLimit = encoding === 'GSM' ? 160 : 70;
  const multiLimit = encoding === 'GSM' ? 153 : 67;
  
  const characterCount = content.length;
  let segmentCount: number;
  
  if (characterCount <= singleLimit) {
    segmentCount = 1;
  } else {
    segmentCount = Math.ceil(characterCount / multiLimit);
  }
  
  // Create segments
  const segments: SMSSegment[] = [];
  if (segmentCount === 1) {
    segments.push({
      content,
      length: characterCount,
      encoding
    });
  } else {
    for (let i = 0; i < segmentCount; i++) {
      const start = i * multiLimit;
      const end = Math.min(start + multiLimit, characterCount);
      segments.push({
        content: content.slice(start, end),
        length: end - start,
        encoding
      });
    }
  }
  
  return {
    characterCount,
    segmentCount,
    encoding,
    maxLength: segmentCount === 1 ? singleLimit : multiLimit,
    segments
  };
}

export function estimateSMSCost(
  phoneNumber: string, 
  segments: number,
  rates: { domestic: number; international: number }
): number {
  const isInternational = !phoneNumber.startsWith('+1');
  const rate = isInternational ? rates.international : rates.domestic;
  return Math.round(rate * segments);
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Add +1 for US numbers if missing
  if (/^\d{10}$/.test(phoneNumber)) {
    return `+1${phoneNumber}`;
  }
  return phoneNumber;
}
```

## Test Requirements

```typescript
// __tests__/sms-configuration.test.ts
import { SMSService } from '@/lib/services/sms-service';
import { analyzeSMSContent } from '@/lib/utils/sms-utils';

describe('SMS Configuration', () => {
  let smsService: SMSService;

  beforeEach(() => {
    smsService = new SMSService();
  });

  describe('SMS Content Analysis', () => {
    it('should calculate segments correctly for GSM content', () => {
      const shortMessage = 'Hello world!';
      const analysis = analyzeSMSContent(shortMessage);
      
      expect(analysis.encoding).toBe('GSM');
      expect(analysis.segmentCount).toBe(1);
      expect(analysis.characterCount).toBe(12);
    });

    it('should handle multi-segment messages', () => {
      const longMessage = 'A'.repeat(200);
      const analysis = analyzeSMSContent(longMessage);
      
      expect(analysis.segmentCount).toBe(2);
      expect(analysis.segments).toHaveLength(2);
      expect(analysis.segments[0].length).toBe(153);
      expect(analysis.segments[1].length).toBe(47);
    });

    it('should detect unicode content correctly', () => {
      const unicodeMessage = 'Hello 🎉 Wedding!';
      const analysis = analyzeSMSContent(unicodeMessage);
      
      expect(analysis.encoding).toBe('UCS2');
      expect(analysis.segmentCount).toBe(1);
    });
  });

  describe('Template Processing', () => {
    it('should replace variables in templates', async () => {
      const template = 'Hi {{client_name}}, your session is on {{date}}';
      const variables = { client_name: 'John', date: 'June 15th' };
      
      const result = await smsService.processTemplate(template, variables);
      
      expect(result).toBe('Hi John, your session is on June 15th');
    });

    it('should leave unreplaced variables intact', async () => {
      const template = 'Hi {{client_name}}, your {{missing_var}} is ready';
      const variables = { client_name: 'John' };
      
      const result = await smsService.processTemplate(template, variables);
      
      expect(result).toBe('Hi John, your {{missing_var}} is ready');
    });
  });

  describe('Compliance Management', () => {
    it('should prevent sending to opted-out recipients', async () => {
      const request = {
        supplierId: 'supplier-1',
        clientId: 'client-1',
        phoneNumber: '+1234567890',
        content: 'Test message'
      };

      // Mock opted-out status
      jest.spyOn(smsService, 'checkCompliance').mockResolvedValue({
        optInStatus: 'opted_out'
      });

      await expect(smsService.sendSMS(request)).rejects.toThrow(
        'Recipient has not opted in to SMS messaging'
      );
    });

    it('should handle STOP keyword correctly', async () => {
      const incomingData = {
        From: '+1234567890',
        Body: 'STOP',
        MessageSid: 'test-message-id'
      };

      await smsService.handleIncomingMessage(incomingData);

      // Verify opt-out was recorded
      const compliance = await smsService.checkCompliance('+1234567890');
      expect(compliance.optInStatus).toBe('opted_out');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate domestic message cost correctly', async () => {
      const cost = await smsService.calculateCost('+1234567890', 1);
      expect(cost).toBe(1); // $0.0075 = 0.75 cents, rounded to 1
    });

    it('should calculate international message cost correctly', async () => {
      const cost = await smsService.calculateCost('+44123456789', 1);
      expect(cost).toBe(2); // International rate doubled
    });

    it('should calculate multi-segment cost correctly', async () => {
      const cost = await smsService.calculateCost('+1234567890', 3);
      expect(cost).toBe(3); // 3 segments * $0.0075 each
    });
  });

  describe('Webhook Handling', () => {
    it('should update message status from delivery webhook', async () => {
      const webhookData = {
        MessageSid: 'test-message-sid',
        MessageStatus: 'delivered',
        ErrorCode: null
      };

      await smsService.handleDeliveryWebhook(webhookData);

      // Verify message status was updated
      // This would require database mocking or test database
    });

    it('should handle failed delivery webhook', async () => {
      const webhookData = {
        MessageSid: 'test-message-sid',
        MessageStatus: 'failed',
        ErrorCode: '30008'
      };

      await smsService.handleDeliveryWebhook(webhookData);

      // Verify error code was recorded
      // This would require database mocking or test database
    });
  });
});
```

## Dependencies

### External Services
- **Twilio API**: Primary SMS provider
- **MessageBird API**: Alternative SMS provider
- **Plivo API**: Backup SMS provider

### Internal Dependencies
- **Supabase Database**: Configuration and message storage
- **Encryption Service**: Secure token storage
- **Rate Limiting**: Prevent abuse
- **Webhook Handler**: Delivery status updates

### Frontend Dependencies
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **React Query**: API state management
- **Shadcn/ui**: UI components

## Effort Estimate

- **Database Schema**: 6 hours
- **Twilio Integration**: 10 hours
- **Template System**: 8 hours
- **Compliance Management**: 12 hours
- **Webhook Handling**: 6 hours
- **Frontend Components**: 20 hours
- **Usage Tracking**: 8 hours
- **Testing**: 16 hours
- **Documentation**: 4 hours

**Total Estimated Effort**: 90 hours (11.5 days)

## Success Metrics

- 99.5% message delivery rate
- Template usage increases efficiency by 60%
- 100% compliance with opt-out requests
- Average message cost under $0.01
- Zero compliance violations
- 90% user satisfaction with SMS features