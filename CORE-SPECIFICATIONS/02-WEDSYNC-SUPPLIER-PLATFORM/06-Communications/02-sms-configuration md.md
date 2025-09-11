# 02-sms-configuration.md

## Overview

SMS messaging setup with Twilio integration, template management, and compliance handling.

## Twilio Setup

```
interface TwilioConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
  messagingServiceSid?: string
  statusCallbackUrl: string
}
```

## Message Templates

- **Quick Templates**: Common messages
- **Variables**: Same as email merge fields
- **Character Counter**: With segment display
- **Unicode Detection**: Special character warning

## Sending Logic

```
// Send with fallback
async function sendSMS(recipient: string, message: string) {
  try {
    const result = await twilio.messages.create({
      body: truncateMessage(message, 160),
      from: config.phoneNumber,
      to: recipient
    })
    await logDelivery(result)
  } catch (error) {
    await handleSMSError(error)
  }
}
```

## Compliance Features

- Opt-in management
- STOP keyword handling
- Time-of-day restrictions
- Geographic regulations

## Cost Management

- Real-time pricing display
- Monthly usage tracking
- Budget alerts
- Bulk sending optimization

## Delivery Tracking

- Status webhooks
- Failed message handling
- Retry logic
- Analytics dashboard