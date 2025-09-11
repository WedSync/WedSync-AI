# 02-sendgrid-config.md

# [02-sendgrid-config.md](http://02-sendgrid-config.md)

## What to Build

Implement SendGrid for transactional emails with dynamic templates, open tracking, and deliverability optimization.

## Key Technical Requirements

### SendGrid Setup

```
npm install @sendgrid/mail @sendgrid/client
```

### Environment Configuration

```
# Platform-wide SendGrid account
SENDGRID_API_KEY=[SG.xxx](http://SG.xxx)
[SENDGRID_FROM_EMAIL=noreply@wedsync.app](mailto:SENDGRID_FROM_EMAIL=noreply@wedsync.app)
SENDGRID_FROM_NAME=WedSync
SENDGRID_WEBHOOK_SECRET=xxx

# Template IDs
SENDGRID_WELCOME_TEMPLATE=d-xxx
SENDGRID_JOURNEY_TEMPLATE=d-xxx
SENDGRID_NOTIFICATION_TEMPLATE=d-xxx
```

### SendGrid Service

```
// lib/sendgrid/client.ts
import sgMail from '@sendgrid/mail';
import sgClient from '@sendgrid/client';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

export { sgMail, sgClient };

// lib/sendgrid/service.ts
export class EmailService {
  async sendTransactional({
    to,
    templateId,
    dynamicData,
    from,
    replyTo,
    attachments,
    sendAt,
    batchId,
    categories,
  }: EmailParams) {
    const msg = {
      to,
      from: from || {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: process.env.SENDGRID_FROM_NAME!,
      },
      templateId,
      dynamicTemplateData: dynamicData,
      ...(replyTo && { replyTo }),
      ...(attachments && { attachments }),
      ...(sendAt && { sendAt }),
      ...(batchId && { batchId }),
      categories: categories || ['transactional'],
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
        subscriptionTracking: { enable: false },
      },
    };
    
    try {
      const [response] = await sgMail.send(msg);
      
      // Log email send
      await this.logEmail({
        to: Array.isArray(to) ? to : [to],
        templateId,
        messageId: response.headers['x-message-id'],
        status: 'sent',
      });
      
      return response;
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }
}
```

### Dynamic Templates

```
// lib/sendgrid/templates.ts
export const TEMPLATES = {
  // Supplier templates
  SUPPLIER_WELCOME: 'd-1234567890',
  SUPPLIER_TRIAL_ENDING: 'd-2345678901',
  SUPPLIER_PAYMENT_FAILED: 'd-3456789012',
  SUPPLIER_CLIENT_ACTIVITY: 'd-4567890123',
  
  // Client templates  
  CLIENT_INVITATION: 'd-5678901234',
  CLIENT_FORM_REMINDER: 'd-6789012345',
  CLIENT_JOURNEY_UPDATE: 'd-7890123456',
  
  // Journey templates (customizable)
  JOURNEY_EMAIL: 'd-8901234567',
};

export const getTemplateData = (type: string, data: any) => {
  switch(type) {
    case 'SUPPLIER_WELCOME':
      return {
        supplier_name: data.businessName,
        trial_end_date: data.trialEndDate,
        dashboard_url: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/dashboard`,
        onboarding_steps: data.onboardingSteps,
      };
    
    case 'CLIENT_INVITATION':
      return {
        couple_names: data.coupleNames,
        supplier_name: data.supplierName,
        invitation_url: data.invitationUrl,
        wedding_date: data.weddingDate,
      };
    
    default:
      return data;
  }
};
```

### Webhook Processing

```
// app/api/webhooks/sendgrid/route.ts
export async function POST(request: Request) {
  const events = await request.json();
  const signature = request.headers.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = request.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');
  
  // Verify webhook
  const isValid = verifyWebhook(
    process.env.SENDGRID_WEBHOOK_SECRET!,
    signature!,
    timestamp!,
    JSON.stringify(events)
  );
  
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process events
  for (const event of events) {
    await processEmailEvent(event);
  }
  
  return new Response('OK');
}

async function processEmailEvent(event: SendGridEvent) {
  const { event: eventType, email, timestamp, sg_message_id } = event;
  
  switch(eventType) {
    case 'delivered':
      await updateEmailStatus(sg_message_id, 'delivered', timestamp);
      break;
    
    case 'open':
      await trackEmailOpen(sg_message_id, timestamp);
      break;
    
    case 'click':
      await trackEmailClick(sg_message_id, event.url, timestamp);
      break;
    
    case 'bounce':
    case 'dropped':
      await handleEmailFailure(sg_message_id, event.reason);
      await updateSuppressionList(email, eventType);
      break;
    
    case 'spamreport':
      await handleSpamReport(email);
      break;
    
    case 'unsubscribe':
      await handleUnsubscribe(email);
      break;
  }
}
```

### Suppression Management

```
// lib/sendgrid/suppression.ts
export async function manageSuppression() {
  // Get global suppression list
  const [, body] = await sgClient.request({
    method: 'GET',
    url: '/v3/suppression/bounces',
  });
  
  // Sync with our database
  for (const bounce of body.bounces) {
    await supabase.from('email_suppressions').upsert({
      email: [bounce.email](http://bounce.email),
      reason: bounce.reason,
      type: 'bounce',
      created_at: new Date(bounce.created * 1000),
    });
  }
}

// Check before sending
export async function canSendEmail(email: string): Promise<boolean> {
  const suppression = await supabase
    .from('email_suppressions')
    .select('*')
    .eq('email', email)
    .single();
  
  return ![suppression.data](http://suppression.data);
}
```

### Database Schema

```
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE,
  template_id TEXT,
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  status TEXT DEFAULT 'queued',
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- bounce, spam, unsubscribe
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_status ON email_logs(status, created_at);
```

## Critical Implementation Notes

### Deliverability Best Practices

- Implement SPF, DKIM, and DMARC records
- Use dedicated IP for high volume (>100k/month)
- Maintain sender reputation above 95%
- Implement link branding for trust

### Template Management

- Version control templates in SendGrid UI
- Test all templates before deployment
- Include unsubscribe links in all templates
- Use handlebars for dynamic content

### Rate Limiting

- SendGrid limit: 10,000 emails/request
- Implement queue for bulk sends
- Batch similar emails together
- Respect daily sending limits

### Cost Optimization

- Use transactional for critical emails only
- Batch marketing emails separately
- Monitor usage to avoid overages
- Clean suppression list regularly