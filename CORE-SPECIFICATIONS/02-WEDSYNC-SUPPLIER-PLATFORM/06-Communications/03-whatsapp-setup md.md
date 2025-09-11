# 03-whatsapp-setup.md

## Overview

WhatsApp Business API integration for rich messaging with media support.

## Business Account Setup

```
interface WhatsAppConfig {
  businessId: string
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  apiVersion: string
}
```

## Message Types

### Text Messages

- Standard text up to 4096 chars
- Emoji support
- Link preview generation

### Media Messages

```
interface MediaMessage {
  type: 'image' | 'document' | 'audio' | 'video'
  mediaUrl: string
  caption?: string
  filename?: string // For documents
}
```

### Template Messages

- Pre-approved templates required
- Variable substitution
- Button actions
- Quick replies

## Session Management

- 24-hour messaging window
- Session initiation rules
- Template message for re-engagement
- Cost per conversation

## Rich Features

- Read receipts
- Typing indicators
- Location sharing
- Contact cards

## Integration Flow

```
// WhatsApp message sending
async function sendWhatsApp(recipient: string, content: MessageContent) {
  if (isWithinSession(recipient)) {
    await sendDirectMessage(content)
  } else {
    await sendTemplateMessage(content)
  }
}
```