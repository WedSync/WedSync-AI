# 04-delivery-methods.md

## What to Build

Multi-channel task delivery system supporting email, SMS, print formats, and in-app access. Each helper receives tasks in their preferred format.

## Key Technical Requirements

### Delivery Channels

```
interface DeliveryMethod {
  type: 'email' | 'sms' | 'whatsapp' | 'print' | 'app';
  recipient: string;
  format: 'individual' | 'grouped' | 'timeline';
  timing: 'immediate' | 'scheduled' | 'day_before';
  confirmation_required: boolean;
}

// Email template
const emailTemplate = {
  subject: 'Your Wedding Day Tasks - {{wedding_date}}',
  body: `
    <h2>Hi {{helper_name}}!</h2>
    <p>Here are your tasks for {{couple_names}}'s wedding:</p>
    {{#tasks}}
    <div class="task-card">
      <h3>{{time}} - {{title}}</h3>
      <p>{{description}}</p>
      <p><strong>Location:</strong> {{location}}</p>
    </div>
    {{/tasks}}
  `
};
```

### Print Formats

- Individual task cards (business card size)
- Full task list per helper (A4/Letter)
- Master timeline with all assignments
- QR codes linking to digital version

## Critical Implementation Notes

- Batch send to prevent spam filters
- Track delivery confirmations
- Generate print-friendly CSS layouts
- Include offline access for day-of
- SMS character limit handling (split long tasks)

## API Endpoints

```
// POST /api/wedme/tasks/deliver
{
  task_ids: string[];
  delivery_method: DeliveryMethod;
  send_at?: Date;
}

// GET /api/wedme/tasks/delivery-status/:batch_id
```