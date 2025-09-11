# 01-email-module.md

## Overview

Automated email sending with rich templates, personalization, and tracking capabilities.

## Configuration Schema

```
interface EmailModule {
  id: string
  type: 'email'
  config: {
    templateId: string
    subject: string
    fromName: string
    fromEmail: string
    replyTo?: string
    attachments?: string[]
    trackOpens: boolean
    trackClicks: boolean
  }
}
```

## Template System

- **Merge Tags**: `{{couple_names}}`, `{{wedding_date}}`, `{{venue_name}}`
- **Conditional Content**: Show/hide blocks based on client data
- **Rich HTML**: Full formatting, images, buttons
- **Plain Text**: Automatic fallback generation

## Personalization Engine

```
// Dynamic content replacement
const personalizedContent = template.replace(
  /{{(\w+)}}/g,
  (match, field) => clientData[field] || ''
)
```

## Delivery Features

- Smart send time optimization
- Bounce handling
- Unsubscribe management
- Reply detection for follow-up

## Analytics Tracking

- Open rates with pixel tracking
- Click-through rates per link
- Device/client breakdown
- Best performing subject lines

## Integration Points

- Resend/SendGrid API for delivery
- Template storage in Supabase
- Activity logging for timeline
- Real-time status updates