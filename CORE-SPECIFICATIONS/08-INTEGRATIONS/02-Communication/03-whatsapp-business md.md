# 03-whatsapp-business.md

# [03-whatsapp-business.md](http://03-whatsapp-business.md)

## What to Build

Implement WhatsApp Business API integration via Twilio for rich messaging with media support, template messages, and two-way conversations with couples.

## Key Technical Requirements

### WhatsApp Business Setup

```
// app/lib/whatsapp/client.ts
import twilio from 'twilio';

export class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;
  
  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = `whatsapp:${fromNumber}`;
  }
  
  async sendMessage({
    to,
    body,
    mediaUrl,
    templateName,
    templateParams
  }: WhatsAppMessage) {
    const toNumber = `whatsapp:${to.replace(/[^0-9+]/g, '')}`;
    
    if (templateName) {
      // Use pre-approved template
      return await this.sendTemplateMessage(
        toNumber,
        templateName,
        templateParams
      );
    }
    
    // Send regular message (requires prior conversation)
    return await this.client.messages.create({
      from: this.fromNumber,
      to: toNumber,
      body,
      ...(mediaUrl && { mediaUrl: [mediaUrl] })
    });
  }
  
  private async sendTemplateMessage(
    to: string,
    templateName: string,
    params?: string[]
  ) {
    // Template messages can be sent without prior conversation
    const contentSid = await this.getTemplateSid(templateName);
    
    return await this.client.messages.create({
      from: this.fromNumber,
      to,
      contentSid,
      contentVariables: JSON.stringify(params || [])
    });
  }
}
```

### Message Templates Management

```
-- Store WhatsApp template configurations
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  template_name TEXT NOT NULL,
  template_sid TEXT, -- Twilio Content SID
  category TEXT CHECK (category IN (
    'appointment_update',
    'payment_update', 
    'shipping_update',
    'alert_update',
    'auto_reply'
  )),
  language TEXT DEFAULT 'en',
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  variables JSONB DEFAULT '[]',
  buttons JSONB DEFAULT '[]',
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track WhatsApp conversations
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  phone_number TEXT NOT NULL,
  conversation_sid TEXT,
  last_message_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

### Two-Way Messaging Handler

```
// app/api/webhooks/whatsapp/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  
  // Extract message details
  const from = formData.get('From') as string;
  const body = formData.get('Body') as string;
  const mediaUrl = formData.get('MediaUrl0') as string;
  const messageSid = formData.get('MessageSid') as string;
  
  // Find associated client
  const phoneNumber = from.replace('whatsapp:', '');
  const client = await findClientByPhone(phoneNumber);
  
  if (!client) {
    // Auto-reply for unknown numbers
    await sendAutoReply(from);
    return new Response('OK');
  }
  
  // Store incoming message
  await storeIncomingMessage({
    clientId: [client.id](http://client.id),
    supplierId: client.supplierId,
    messageSid,
    body,
    mediaUrl,
    receivedAt: new Date()
  });
  
  // Trigger any automated responses
  await processIncomingMessage(client, body);
  
  // Notify supplier dashboard
  await notifySupplier(client.supplierId, {
    type: 'whatsapp_message',
    clientName: [client.name](http://client.name),
    message: body
  });
  
  return new Response('OK');
}
```

### Rich Media Support

```
// app/lib/whatsapp/media-handler.ts
export class WhatsAppMediaHandler {
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ) {
    return await this.whatsapp.sendMessage({
      to,
      body: caption || '',
      mediaUrl: imageUrl
    });
  }
  
  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string
  ) {
    // Upload to Twilio first
    const mediaUrl = await this.uploadToTwilio(documentUrl);
    
    return await this.whatsapp.sendMessage({
      to,
      body: `Document: ${filename}`,
      mediaUrl
    });
  }
  
  async sendLocation(
    to: string,
    venue: VenueDetails
  ) {
    const locationString = `
${[venue.name](http://venue.name)}
${venue.address}

Google Maps: [https://maps.google.com/?q=${venue.lat},${venue.lng}](https://maps.google.com/?q=${venue.lat},${venue.lng})
    `;
    
    return await this.whatsapp.sendMessage({
      to,
      body: locationString
    });
  }
  
  private async uploadToTwilio(fileUrl: string): Promise<string> {
    // Upload media to Twilio's storage
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    
    // Create media resource in Twilio
    // Return Twilio media URL
    return '[https://media.twiliocdn.com/](https://media.twiliocdn.com/)...';
  }
}
```

### Template Builder UI

```
// app/components/whatsapp/TemplateBuilder.tsx
export const WhatsAppTemplateBuilder = () => {
  const [template, setTemplate] = useState<WhatsAppTemplate>({
    name: '',
    category: 'appointment_update',
    header: { type: 'text', text: '' },
    body: '',
    footer: '',
    buttons: []
  });
  
  const addVariable = (index: number) => {
    const variable = `{{${index}}}`;
    setTemplate(prev => ({
      ...prev,
      body: prev.body + variable
    }));
  };
  
  const addButton = (type: 'quick_reply' | 'call' | 'url') => {
    const newButton = {
      type,
      text: '',
      ...(type === 'url' && { url: '' }),
      ...(type === 'call' && { phoneNumber: '' })
    };
    
    setTemplate(prev => ({
      ...prev,
      buttons: [...prev.buttons, newButton]
    }));
  };
  
  const submitForApproval = async () => {
    // Submit to WhatsApp for approval
    // This usually takes 24-48 hours
    await submitTemplateToWhatsApp(template);
  };
  
  return (
    <div className="whatsapp-template-builder">
      <TemplatePreview template={template} />
      <TemplateEditor 
        template={template}
        onChange={setTemplate}
        onAddVariable={addVariable}
        onAddButton={addButton}
      />
      <ApprovalStatus template={template} />
    </div>
  );
};
```

### Session Management

```
// app/lib/whatsapp/session-manager.ts
export class WhatsAppSessionManager {
  // WhatsApp has 24-hour session window
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000;
  
  async canSendMessage(clientPhone: string): Promise<boolean> {
    const session = await this.getActiveSession(clientPhone);
    
    if (!session) return false;
    
    const now = new Date();
    return session.expiresAt > now;
  }
  
  async initiateSession(clientPhone: string): Promise<void> {
    // Must use template message to initiate
    await this.sendTemplateMessage(clientPhone, 'session_start');
    
    // Create session record
    await this.createSession({
      phoneNumber: clientPhone,
      startedAt: new Date(),
      expiresAt: new Date([Date.now](http://Date.now)() + this.SESSION_DURATION)
    });
  }
  
  async renewSession(clientPhone: string): Promise<void> {
    // Update session expiry on any interaction
    await this.updateSessionExpiry(
      clientPhone,
      new Date([Date.now](http://Date.now)() + this.SESSION_DURATION)
    );
  }
}
```

## Critical Implementation Notes

1. **24-Hour Session Window**: Can only send non-template messages within 24 hours of last client message
2. **Template Approval**: All template messages need WhatsApp approval (24-48 hours)
3. **Phone Number Format**: Must include country code without + or spaces
4. **Media Limitations**: Images max 5MB, Documents max 100MB
5. **Rate Limits**: 1000 messages per second per phone number
6. **Opt-in Required**: Must have explicit consent to message via WhatsApp
7. **Business Verification**: Production requires Facebook Business verification
8. **Sandbox Testing**: Use Twilio sandbox for development (limited features)

## Testing Checklist

- [ ]  Test sandbox number setup
- [ ]  Verify template message delivery
- [ ]  Test 24-hour session window
- [ ]  Confirm media message support
- [ ]  Test two-way conversation flow
- [ ]  Verify opt-in/opt-out handling
- [ ]  Test international number formats
- [ ]  Validate webhook message receipt