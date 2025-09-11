# WedSync API Integration Documentation

## Overview

The WedSync API provides comprehensive integration capabilities for wedding suppliers to connect their existing tools and automate their workflows. This documentation covers webhook management, third-party API connectors, and event-driven architecture.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Versioning](#api-versioning)
4. [Webhook Integration](#webhook-integration)
5. [Third-Party Connectors](#third-party-connectors)
6. [Event System](#event-system)
7. [Wedding Industry Examples](#wedding-industry-examples)
8. [SDKs and Libraries](#sdks-and-libraries)
9. [Rate Limiting](#rate-limiting)
10. [Error Handling](#error-handling)
11. [Testing](#testing)

## Quick Start

### 1. Set Up Webhook Endpoint

```bash
# Test webhook endpoint
curl -X POST https://api.wedsync.com/api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Version: 2.1" \
  -H "X-Webhook-Signature: sha256=your-signature" \
  -d '{
    "event_type": "booking.created",
    "event_id": "evt_123456789",
    "timestamp": "2024-01-15T10:00:00Z",
    "source": "booking_system",
    "data": {
      "vendor_id": "vendor_123",
      "couple_names": ["John Doe", "Jane Smith"],
      "wedding_date": "2024-06-15",
      "service_type": "photography",
      "amount": 2500
    }
  }'
```

### 2. Response Format

```json
{
  "success": true,
  "data": {
    "event_id": "evt_123456789",
    "processed_at": "2024-01-15T10:00:01Z",
    "actions_taken": [
      "booking_created_in_database",
      "confirmation_email_sent",
      "vendor_notified",
      "availability_updated"
    ]
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:01Z",
    "request_id": "req_abcd1234"
  }
}
```

## Authentication

### API Keys

```javascript
// JavaScript/Node.js
const headers = {
  'Authorization': 'Bearer your-api-key',
  'X-API-Version': '2.1',
  'Content-Type': 'application/json'
};
```

```python
# Python
headers = {
    'Authorization': 'Bearer your-api-key',
    'X-API-Version': '2.1',
    'Content-Type': 'application/json'
}
```

```php
// PHP
$headers = [
    'Authorization: Bearer your-api-key',
    'X-API-Version: 2.1',
    'Content-Type: application/json'
];
```

```csharp
// C#
var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer your-api-key");
client.DefaultRequestHeaders.Add("X-API-Version", "2.1");
```

### Webhook Signature Verification

```javascript
// Node.js signature verification
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

```python
# Python signature verification
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

## API Versioning

### Version Selection

```bash
# Method 1: Header-based versioning (Recommended)
curl -H "X-API-Version: 2.1" https://api.wedsync.com/api/webhooks

# Method 2: Accept header
curl -H "Accept: application/vnd.wedsync.v2.1+json" https://api.wedsync.com/api/webhooks

# Method 3: URL parameter
curl https://api.wedsync.com/api/webhooks?version=2.1

# Method 4: URL path
curl https://api.wedsync.com/api/v2.1/webhooks
```

### Version Differences

| Feature | v1.0 | v1.1 | v2.0 | v2.1 |
|---------|------|------|------|------|
| Event Types | Basic | Extended | Full | Enhanced |
| Validation | None | Basic | Schema | Strict |
| Correlation | No | No | Yes | Yes |
| Priority | No | No | Basic | Advanced |
| Automation | Manual | Semi | Auto | Full |

## Webhook Integration

### Event Types

```typescript
// TypeScript definitions
interface WebhookEvent {
  event_type: 
    | 'booking.created'
    | 'booking.updated'
    | 'booking.cancelled'
    | 'payment.received'
    | 'payment.failed'
    | 'form.submitted'
    | 'vendor.connected'
    | 'availability.changed'
    | 'review.received'
    | 'message.sent';
  
  event_id: string;
  timestamp: string;
  source: string;
  data: Record<string, any>;
  correlation_id?: string;
  metadata?: {
    vendor_id?: string;
    wedding_date?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}
```

### Booking Events

```json
{
  "event_type": "booking.created",
  "event_id": "evt_booking_123",
  "timestamp": "2024-01-15T10:00:00Z",
  "source": "booking_system",
  "data": {
    "booking_id": "booking_123",
    "vendor_id": "vendor_123",
    "couple_names": ["John Doe", "Jane Smith"],
    "wedding_date": "2024-06-15",
    "venue": "Grand Wedding Hall",
    "service_type": "photography",
    "service_start": "2024-06-15T14:00:00Z",
    "service_end": "2024-06-15T18:00:00Z",
    "amount": 2500,
    "currency": "USD",
    "couple_email": "couple@example.com",
    "couple_phone": "+1234567890"
  },
  "metadata": {
    "vendor_id": "vendor_123",
    "wedding_date": "2024-06-15",
    "priority": "high"
  }
}
```

### Payment Events

```json
{
  "event_type": "payment.received",
  "event_id": "evt_payment_456",
  "timestamp": "2024-01-15T11:00:00Z",
  "source": "stripe",
  "data": {
    "amount": 250000,
    "currency": "usd",
    "booking_id": "booking_123",
    "payment_intent_id": "pi_1234567890",
    "customer_email": "couple@example.com",
    "payment_method": "card",
    "receipt_url": "https://pay.stripe.com/receipts/..."
  },
  "correlation_id": "corr_booking_workflow_123"
}
```

## Third-Party Connectors

### Stripe Integration

```javascript
// JavaScript/Node.js
const { StripeConnector } = require('@wedsync/api-connectors');

const stripe = new StripeConnector(process.env.STRIPE_SECRET_KEY);

// Create payment intent for wedding booking
const paymentIntent = await stripe.createWeddingPaymentIntent(
  250000, // $2500.00
  'usd',
  {
    vendor_id: 'vendor_123',
    wedding_date: '2024-06-15',
    couple_names: ['John Doe', 'Jane Smith'],
    service_type: 'photography'
  }
);
```

```python
# Python
from wedsync_connectors import StripeConnector

stripe = StripeConnector(api_key=os.environ['STRIPE_SECRET_KEY'])

# Create customer for vendor
customer = await stripe.create_customer_for_vendor({
    'id': 'vendor_123',
    'name': 'Wedding Photography Pro',
    'type': 'photographer',
    'contact': {
        'email': 'vendor@example.com',
        'phone': '+1234567890'
    }
})
```

### Zapier Integration

```javascript
// Trigger Zapier webhook
const { ZapierConnector } = require('@wedsync/api-connectors');

const zapier = new ZapierConnector(process.env.ZAPIER_API_KEY);

// Trigger booking automation
const result = await zapier.triggerWeddingBooking(
  'your-zap-webhook-id',
  {
    vendor_id: 'vendor_123',
    couple_names: ['John Doe', 'Jane Smith'],
    wedding_date: '2024-06-15',
    service_type: 'photography',
    amount: 2500
  }
);
```

### Calendly Integration

```javascript
// Calendly event management
const { CalendlyConnector } = require('@wedsync/api-connectors');

const calendly = new CalendlyConnector(process.env.CALENDLY_ACCESS_TOKEN);

// Get wedding consultations for the week
const startTime = '2024-01-15T00:00:00Z';
const endTime = '2024-01-21T23:59:59Z';

const consultations = await calendly.getWeddingConsultations(startTime, endTime);
```

### Mailchimp Integration

```javascript
// Email marketing automation
const { MailchimpConnector } = require('@wedsync/api-connectors');

const mailchimp = new MailchimpConnector(
  process.env.MAILCHIMP_API_KEY,
  'us1' // Your Mailchimp server
);

// Create a list for wedding couples
const list = await mailchimp.createWeddingCoupleList(
  'Summer 2024 Weddings',
  '2024-06-15'
);

// Add couples to list
await mailchimp.addCoupleToList(
  list.id,
  ['bride@example.com', 'groom@example.com'],
  {
    couple_names: ['Jane Smith', 'John Doe'],
    wedding_date: '2024-06-15',
    venue: 'Grand Wedding Hall'
  }
);
```

## Event System

### Publishing Events

```javascript
// JavaScript event publishing
const { apiEventSystem } = require('@wedsync/events');

await apiEventSystem.publishEvent({
  id: crypto.randomUUID(),
  type: 'booking.created',
  source: 'your_system',
  data: {
    booking_id: 'booking_123',
    vendor_id: 'vendor_123',
    couple_email: 'couple@example.com'
  },
  timestamp: new Date().toISOString(),
  metadata: {
    priority: 'high',
    wedding_date: '2024-06-15'
  }
});
```

### Event Subscriptions

```javascript
// Subscribe to events
const subscriptionId = await apiEventSystem.createEventSubscription(
  'vendor_123',
  ['booking.created', 'payment.received'],
  'https://your-domain.com/webhooks/wedsync', // Optional external webhook
  'your-webhook-secret' // Optional
);

// Remove subscription
await apiEventSystem.removeEventSubscription(subscriptionId);
```

### Event Correlation

```javascript
// Correlated event workflow
const correlationId = crypto.randomUUID();

// 1. Booking created
await apiEventSystem.publishEvent({
  id: 'evt_1',
  type: 'booking.created',
  source: 'booking_system',
  data: bookingData,
  timestamp: new Date().toISOString(),
  correlation_id: correlationId
});

// 2. Email confirmation (caused by booking creation)
await apiEventSystem.publishEvent({
  id: 'evt_2',
  type: 'email.send',
  source: 'notification_system',
  data: emailData,
  timestamp: new Date().toISOString(),
  correlation_id: correlationId,
  causation_id: 'evt_1'
});
```

## Wedding Industry Examples

### Photography Studio Workflow

```javascript
// Complete photography booking workflow
class PhotographyStudioIntegration {
  constructor() {
    this.zapier = new ZapierConnector(process.env.ZAPIER_API_KEY);
    this.stripe = new StripeConnector(process.env.STRIPE_SECRET_KEY);
    this.calendly = new CalendlyConnector(process.env.CALENDLY_ACCESS_TOKEN);
  }

  async handleBookingInquiry(inquiryData) {
    const correlationId = crypto.randomUUID();
    
    // 1. Create lead in CRM via Zapier
    await this.zapier.triggerZap('create-lead-zap-id', {
      client_name: inquiryData.couple_names.join(' & '),
      wedding_date: inquiryData.wedding_date,
      service_type: 'wedding-photography',
      budget: inquiryData.budget,
      correlation_id: correlationId
    });
    
    // 2. Send consultation booking link
    const eventTypes = await this.calendly.listEventTypes();
    const consultationLink = eventTypes.data.find(
      et => et.name.includes('Wedding Consultation')
    );
    
    // 3. Track inquiry event
    await apiEventSystem.publishEvent({
      id: crypto.randomUUID(),
      type: 'inquiry.received',
      source: 'photography_studio',
      data: inquiryData,
      correlation_id: correlationId,
      metadata: {
        vendor_id: inquiryData.vendor_id,
        service_type: 'photography',
        priority: 'high'
      }
    });
    
    return { success: true, correlation_id: correlationId };
  }

  async handleBookingConfirmed(bookingData) {
    const correlationId = crypto.randomUUID();
    
    // 1. Create Stripe customer and payment intent
    const paymentIntent = await this.stripe.createWeddingPaymentIntent(
      bookingData.deposit_amount,
      'usd',
      {
        vendor_id: bookingData.vendor_id,
        wedding_date: bookingData.wedding_date,
        couple_names: bookingData.couple_names,
        service_type: 'photography'
      }
    );
    
    // 2. Update CRM with booking confirmation
    await this.zapier.triggerZap('confirm-booking-zap-id', {
      booking_id: bookingData.id,
      payment_intent_id: paymentIntent.data.id,
      status: 'confirmed',
      correlation_id: correlationId
    });
    
    // 3. Block calendar dates
    // This would integrate with your calendar system
    
    return { 
      success: true, 
      payment_intent: paymentIntent.data,
      correlation_id: correlationId 
    };
  }
}
```

### Venue Management Integration

```javascript
class VenueManagementIntegration {
  async handleVenueBooking(venueBookingData) {
    const correlationId = crypto.randomUUID();
    
    // 1. Check venue availability
    const availability = await this.checkVenueAvailability(
      venueBookingData.venue_id,
      venueBookingData.wedding_date
    );
    
    if (!availability.available) {
      throw new Error('Venue not available on requested date');
    }
    
    // 2. Create booking with payment terms
    const booking = await this.createVenueBooking({
      ...venueBookingData,
      correlation_id: correlationId
    });
    
    // 3. Trigger vendor automations
    await this.zapier.triggerZap('venue-booking-zap-id', {
      booking_id: booking.id,
      couple_names: venueBookingData.couple_names,
      wedding_date: venueBookingData.wedding_date,
      guest_count: venueBookingData.guest_count,
      total_amount: venueBookingData.total_amount,
      correlation_id: correlationId
    });
    
    // 4. Coordinate with other vendors
    await apiEventSystem.publishEvent({
      id: crypto.randomUUID(),
      type: 'venue.booked',
      source: 'venue_management',
      data: {
        venue_id: venueBookingData.venue_id,
        wedding_date: venueBookingData.wedding_date,
        couple_id: venueBookingData.couple_id,
        vendor_coordination_needed: true
      },
      correlation_id: correlationId,
      metadata: {
        priority: 'urgent',
        wedding_date: venueBookingData.wedding_date
      }
    });
    
    return { success: true, booking, correlation_id: correlationId };
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @wedsync/api-sdk
```

```typescript
import { WedSyncAPI } from '@wedsync/api-sdk';

const wedsync = new WedSyncAPI({
  apiKey: process.env.WEDSYNC_API_KEY,
  version: '2.1',
  environment: 'production' // or 'sandbox'
});

// Webhook handling
wedsync.webhooks.handle(request, {
  'booking.created': async (event) => {
    console.log('New booking:', event.data);
    // Your business logic here
  },
  'payment.received': async (event) => {
    console.log('Payment received:', event.data);
    // Update booking status, send receipts, etc.
  }
});

// API calls
const booking = await wedsync.bookings.create({
  vendor_id: 'vendor_123',
  couple_names: ['John Doe', 'Jane Smith'],
  wedding_date: '2024-06-15',
  service_type: 'photography'
});
```

### Python SDK

```bash
pip install wedsync-python
```

```python
from wedsync import WedSyncAPI
import os

wedsync = WedSyncAPI(
    api_key=os.environ['WEDSYNC_API_KEY'],
    version='2.1',
    environment='production'
)

# Handle webhooks
@wedsync.webhook_handler('booking.created')
async def handle_booking_created(event):
    print(f"New booking: {event['data']}")
    # Your business logic here

# Create booking
booking = await wedsync.bookings.create({
    'vendor_id': 'vendor_123',
    'couple_names': ['John Doe', 'Jane Smith'],
    'wedding_date': '2024-06-15',
    'service_type': 'photography'
})
```

### PHP SDK

```bash
composer require wedsync/api-sdk
```

```php
<?php
require_once 'vendor/autoload.php';

use WedSync\API\Client;
use WedSync\API\Webhooks\Handler;

$wedsync = new Client([
    'api_key' => $_ENV['WEDSYNC_API_KEY'],
    'version' => '2.1',
    'environment' => 'production'
]);

// Handle webhooks
$handler = new Handler($_ENV['WEBHOOK_SECRET']);

$handler->on('booking.created', function ($event) {
    error_log('New booking: ' . json_encode($event->data));
    // Your business logic here
});

$handler->handle($_POST, getallheaders());

// Create booking
$booking = $wedsync->bookings->create([
    'vendor_id' => 'vendor_123',
    'couple_names' => ['John Doe', 'Jane Smith'],
    'wedding_date' => '2024-06-15',
    'service_type' => 'photography'
]);
?>
```

## Rate Limiting

### Rate Limits by Plan

| Plan | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 100 | 1,000 | 10,000 |
| Professional | 500 | 5,000 | 50,000 |
| Enterprise | 2,000 | 20,000 | 200,000 |

### Rate Limit Headers

```bash
# Response headers
HTTP/1.1 200 OK
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
X-RateLimit-Limit: 100
```

### Handling Rate Limits

```javascript
async function makeAPICall() {
  try {
    const response = await fetch('/api/webhooks', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = (parseInt(resetTime) * 1000) - Date.now();
      
      console.log(`Rate limited. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return makeAPICall(); // Retry
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## Error Handling

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": {
      "field": "wedding_date",
      "issue": "Date must be in the future"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:00:00Z",
    "request_id": "req_abcd1234"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_FAILED` | Request validation error | 400 |
| `AUTHENTICATION_REQUIRED` | Missing or invalid API key | 401 |
| `AUTHORIZATION_FAILED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTEGRATION_ERROR` | Third-party service error | 502 |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | 500 |

### Wedding Industry Specific Errors

```json
{
  "success": false,
  "error": {
    "code": "WEDDING_DATE_CONFLICT",
    "message": "Vendor is not available on 2024-06-15",
    "details": {
      "wedding_date": "2024-06-15",
      "vendor_id": "vendor_123",
      "conflict_reason": "Another wedding already booked",
      "alternative_dates": ["2024-06-16", "2024-06-22"]
    }
  }
}
```

## Testing

### Webhook Testing

```bash
# Test webhook with curl
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=test-signature" \
  -d '{
    "event_type": "booking.created",
    "data": {
      "vendor_id": "test_vendor",
      "couple_names": ["Test Bride", "Test Groom"],
      "wedding_date": "2024-12-31"
    }
  }'
```

### Mock Services

```javascript
// Use mock services for testing
const { MockStripeAPI, MockZapierAPI } = require('@wedsync/test-utils');

describe('Integration Tests', () => {
  let mockStripe, mockZapier;
  
  beforeEach(() => {
    mockStripe = new MockStripeAPI();
    mockZapier = new MockZapierAPI();
  });
  
  it('should handle booking workflow', async () => {
    // Test booking creation workflow
    const result = await handleBookingCreated({
      vendor_id: 'test_vendor',
      couple_names: ['John Doe', 'Jane Smith'],
      wedding_date: '2024-06-15'
    });
    
    expect(result.success).toBe(true);
    expect(mockZapier.getTriggeredZaps()).toHaveLength(1);
  });
});
```

## Support

- **Documentation**: [https://docs.wedsync.com/api](https://docs.wedsync.com/api)
- **Status Page**: [https://status.wedsync.com](https://status.wedsync.com)
- **Support**: [support@wedsync.com](mailto:support@wedsync.com)
- **Developer Slack**: [https://wedsync-dev.slack.com](https://wedsync-dev.slack.com)

## Changelog

### v2.1 (Current)
- Enhanced event type validation
- Correlation ID support
- Priority-based processing
- Wedding industry optimizations

### v2.0
- Full schema validation
- Enhanced error handling
- Metadata support
- Improved response format

### v1.1 (Deprecated)
- Improved field validation
- Better error messages
- Extended event type support

### v1.0 (Deprecated)
- Basic webhook functionality
- Limited event types
- Legacy field mapping