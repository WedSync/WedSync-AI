# 06-bulk-messaging.md

## Overview

Mass communication tools for reaching multiple clients simultaneously with personalization.

## Bulk Campaign Setup

```
interface BulkCampaign {
  name: string
  recipients: RecipientFilter
  message: {
    subject?: string // Email only
    content: string
    channel: ('email' | 'sms' | 'whatsapp')[]
  }
  scheduling: {
    sendTime: 'now' | 'scheduled' | 'optimal'
    timezone: 'recipient_local' | 'sender_local'
  }
  personalization: boolean
}
```

## Recipient Filtering

- **By Status**: Active, upcoming, past
- **By Date**: Wedding month/season
- **By Tags**: Custom segments
- **By Engagement**: Opens, clicks, responses

## Personalization at Scale

```
// Bulk personalization
recipients.forEach(client => {
  const personalizedMessage = template
    .replace(/{{(\w+)}}/g, (match, field) => 
      client[field] || defaultValues[field]
    )
  queueMessage(client, personalizedMessage)
})
```

## Send Optimization

- Throttling to avoid spam flags
- Optimal send time AI
- Batch processing
- Provider limits respect

## Compliance

- Unsubscribe handling
- Suppression lists
- CAN-SPAM compliance
- GDPR considerations

## Analytics

- Campaign performance dashboard
- A/B test results
- Engagement heat maps
- ROI tracking