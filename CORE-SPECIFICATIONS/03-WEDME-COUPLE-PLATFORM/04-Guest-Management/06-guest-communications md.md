# 06-guest-communications.md

## What to Build

Bulk communication system for save-the-dates, invitations, updates, and thank you notes with tracking.

## Key Technical Requirements

### Communication Types

```
// types/guestComms.ts
interface GuestMessage {
  id: string;
  type: 'save_the_date' | 'invitation' | 'update' | 'thank_you' | 'custom';
  recipients: RecipientGroup[];
  subject: string;
  content: string;
  attachments?: Attachment[];
  scheduled_at?: Date;
  sent_at?: Date;
  tracking: MessageTracking;
}

interface RecipientGroup {
  type: 'all' | 'attending' | 'pending' | 'category' | 'custom';
  filter?: any; // Category name, side, etc.
  guest_ids?: string[];
}

interface MessageTracking {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: string[];
}
```

### Message Builder

```
// components/communications/MessageBuilder.tsx
const GuestMessageComposer = () => {
  const [messageType, setMessageType] = useState<string>('update');
  const [recipients, setRecipients] = useState<RecipientGroup[]>([]);
  
  return (
    <div className="message-composer">
      <RecipientSelector 
        onChange={setRecipients}
        presets={[
          { label: 'All Guests', value: 'all' },
          { label: 'Attending Only', value: 'attending' },
          { label: 'Pending RSVPs', value: 'pending' }
        ]}
      />
      
      <TemplateSelector 
        type={messageType}
        templates={getTemplatesForType(messageType)}
      />
      
      <RichTextEditor 
        placeholder="Write your message..."
        variables={[
          '{{guest_name}}',
          '{{wedding_date}}',
          '{{venue_name}}',
          '{{rsvp_link}}'
        ]}
      />
      
      <ScheduleSender />
    </div>
  );
};
```

### Bulk Send System

```
// services/bulkMessaging.ts
class BulkMessageService {
  async sendToGuests(message: GuestMessage) {
    const batches = chunk(message.recipients, 50); // Rate limiting
    
    for (const batch of batches) {
      await Promise.all(
        [batch.map](http://batch.map)(async (recipient) => {
          const personalized = this.personalizeMessage(
            message.content,
            recipient
          );
          
          await this.sendEmail({
            to: [recipient.email](http://recipient.email),
            subject: message.subject,
            html: personalized,
            tracking_id: `${[message.id](http://message.id)}-${[recipient.id](http://recipient.id)}`
          });
        })
      );
      
      await sleep(1000); // Rate limiting
    }
  }
  
  personalizeMessage(template: string, guest: Guest): string {
    return template
      .replace('{{guest_name}}', `${guest.first_name} ${guest.last_name}`)
      .replace('{{rsvp_link}}', generateRSVPLink([guest.id](http://guest.id)));
  }
}
```

## Critical Implementation Notes

- Preview before sending with test email
- Track open/click rates per message
- Automatic bounce handling
- RSVP reminder automation
- Thank you note tracking by gift received

## API Endpoint

```
// app/api/guests/message/route.ts
export async function POST(request: Request) {
  const message = await request.json();
  
  // Queue for background processing
  await queueBulkMessage(message);
  
  return NextResponse.json({ 
    queued: true,
    estimated_time: message.recipients.length * 2 // seconds
  });
}
```