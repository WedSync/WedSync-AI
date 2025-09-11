# 01-twilio-setup.md

# [01-twilio-setup.md](http://01-twilio-setup.md)

## What to Build

Integrate Twilio for SMS and WhatsApp messaging capabilities within the customer journey automation system. Suppliers can send automated messages to couples at key milestones.

## Key Technical Requirements

### Environment Variables

```
# .env.local
TWILIO_ACCOUNT_SID=supplier_provides_this
TWILIO_AUTH_TOKEN=supplier_provides_this
TWILIO_PHONE_NUMBER=supplier_provides_this
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox for dev
```

### Twilio Client Setup

```
// app/lib/twilio/client.ts
import twilio from 'twilio';

export class TwilioService {
  private client: twilio.Twilio | null = null;
  
  constructor(supplierId: string) {
    // Fetch supplier's Twilio credentials from database
    this.initializeClient(supplierId);
  }
  
  private async initializeClient(supplierId: string) {
    const credentials = await this.getSupplierTwilioCredentials(supplierId);
    
    if (credentials?.accountSid && credentials?.authToken) {
      this.client = twilio(
        credentials.accountSid, 
        credentials.authToken
      );
    }
  }
  
  async sendSMS(to: string, body: string, mediaUrl?: string) {
    if (!this.client) throw new Error('Twilio not configured');
    
    return await this.client.messages.create({
      body,
      from: this.twilioPhoneNumber,
      to,
      ...(mediaUrl && { mediaUrl: [mediaUrl] })
    });
  }
  
  async sendWhatsApp(to: string, body: string) {
    if (!this.client) throw new Error('Twilio not configured');
    
    return await this.client.messages.create({
      body,
      from: 'whatsapp:' + this.whatsappNumber,
      to: 'whatsapp:' + to
    });
  }
}
```

### Database Schema

```
-- Store supplier's Twilio configuration
CREATE TABLE supplier_twilio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  account_sid TEXT ENCRYPTED,
  auth_token TEXT ENCRYPTED,
  phone_number TEXT,
  whatsapp_number TEXT,
  monthly_budget DECIMAL(10, 2),
  current_usage DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track message history for billing
CREATE TABLE twilio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  message_sid TEXT UNIQUE,
  type TEXT CHECK (type IN ('sms', 'whatsapp')),
  to_number TEXT,
  message_body TEXT,
  status TEXT,
  cost DECIMAL(10, 4),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Setup Wizard Component

```
// app/components/integrations/TwilioSetupWizard.tsx
export const TwilioSetupWizard = () => {
  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState({});
  
  const verifyCredentials = async () => {
    // Test connection with Twilio API
    try {
      const testClient = twilio(credentials.accountSid, credentials.authToken);
      await testClient.api.accounts(credentials.accountSid).fetch();
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const sendTestMessage = async () => {
    // Send test SMS to supplier's phone
    const service = new TwilioService(supplierId);
    await service.sendSMS(
      supplierPhone,
      'WedSync test message successful! 🎉'
    );
  };
  
  return (
    <div className="twilio-setup-wizard">
      {step === 1 && <AccountCredentials />}
      {step === 2 && <PhoneNumberSetup />}
      {step === 3 && <BudgetConfiguration />}
      {step === 4 && <TestConnection />}
    </div>
  );
};
```

### Journey Module Integration

```
// app/lib/journey/modules/sms-module.ts
export const executeSMSModule = async (
  module: SMSModule,
  context: JourneyContext
) => {
  const twilioService = new TwilioService(context.supplierId);
  
  // Replace merge tags
  const processedBody = replaceMergeTags(
    module.messageBody,
    context.clientData
  );
  
  try {
    const message = await twilioService.sendSMS(
      context.clientPhone,
      processedBody
    );
    
    // Track in database
    await saveMessageRecord({
      supplierId: context.supplierId,
      clientId: context.clientId,
      messageSid: message.sid,
      type: 'sms',
      status: message.status,
      cost: message.price
    });
    
    return { success: true, messageId: message.sid };
  } catch (error) {
    // Handle rate limits, invalid numbers, etc.
    await logJourneyError(context.journeyId, error);
    return { success: false, error };
  }
};
```

### Webhook Handler for Status Updates

```
// app/api/webhooks/twilio/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('X-Twilio-Signature');
  
  // Verify webhook signature
  const authToken = await getAuthTokenForWebhook(body);
  const isValid = twilio.validateRequest(
    authToken,
    signature,
    process.env.TWILIO_WEBHOOK_URL,
    body
  );
  
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const data = JSON.parse(body);
  
  // Update message status in database
  await updateMessageStatus({
    messageSid: data.MessageSid,
    status: data.MessageStatus,
    errorCode: data.ErrorCode
  });
  
  return new Response('OK', { status: 200 });
}
```

## Critical Implementation Notes

1. **Credential Security**: Always encrypt Twilio credentials in database using Supabase vault
2. **Rate Limiting**: Implement rate limits per supplier (160 chars = 1 SMS segment)
3. **Phone Validation**: Use Twilio Lookup API to validate numbers before sending
4. **Cost Tracking**: Track message costs and alert suppliers near budget limits
5. **Opt-out Handling**: Respect STOP/UNSUBSCRIBE messages per regulations
6. **International Support**: Handle country codes and international formatting
7. **Sandbox Limitations**: WhatsApp sandbox requires pre-approved templates initially
8. **Error Recovery**: Implement retry logic for temporary failures (network issues)

## Testing Checklist

- [ ]  Verify credentials validation works
- [ ]  Test SMS delivery to various carriers
- [ ]  Confirm WhatsApp sandbox messaging
- [ ]  Validate webhook signature verification
- [ ]  Test rate limiting and budget controls
- [ ]  Verify international number formatting
- [ ]  Confirm message status tracking
- [ ]  Test opt-out handling