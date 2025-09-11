# 02-sms-whatsapp-module.md

## Overview

Short message delivery via SMS and WhatsApp with multimedia support and delivery confirmation.

## Configuration

```
interface MessageModule {
  type: 'sms' | 'whatsapp'
  config: {
    channel: 'sms' | 'whatsapp' | 'both'
    message: string
    mediaUrl?: string // WhatsApp only
    fallbackToSms: boolean
    requireOptIn: boolean
  }
}
```

## Message Composition

- **Character Limits**: SMS 160, WhatsApp 4096
- **Unicode Support**: Emoji handling
- **Link Shortening**: Automatic URL compression
- **Media Attachments**: Images, PDFs (WhatsApp)

## Delivery Logic

```
// Channel selection
if (client.whatsappOptIn && channel === 'whatsapp') {
  await sendWhatsApp(message)
} else if (client.smsOptIn) {
  await sendSMS(message)
}
```

## Cost Management

- Per-message pricing display
- Monthly budget tracking
- Geographic rate variations
- Bulk sending discounts

## Compliance

- Opt-in verification required
- Unsubscribe keywords (STOP, CANCEL)
- GDPR message retention
- Time-of-day restrictions

## Twilio Integration

- API key configuration per supplier
- Phone number provisioning
- Delivery status webhooks
- Error handling and retries