# Wedding Supplier Integration Guide

## Overview

This guide helps wedding suppliers integrate their existing tools and workflows with WedSync's API. Whether you use CRM systems, booking platforms, or payment processors, WedSync provides seamless integration options to enhance your wedding business operations.

## Quick Start Integration

### 1. Get Your API Credentials

1. Log into your WedSync supplier dashboard
2. Navigate to **Settings** > **API Access**
3. Click **Generate API Key**
4. Copy your JWT token and store it securely

### 2. Test Your Connection

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.wedsync.com/v1/suppliers/me
```

### 3. Import Your Existing Clients

Use our bulk import endpoint to migrate your existing wedding clients:

```javascript
const clients = [
  {
    couple_name: "John & Jane Smith",
    wedding_date: "2025-06-15T14:00:00Z",
    venue_name: "Yorkshire Dales Manor",
    guest_count: 120,
    budget_range: "2500_5000",
    contact_email: "johnjane@example.com"
  }
  // ... more clients
];

const response = await fetch('https://api.wedsync.com/v1/suppliers/me/clients/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ clients })
});
```

## CRM Integration Patterns

### HubSpot Integration

Connect WedSync with HubSpot to sync wedding client data and track sales pipeline.

```javascript
// Sync new WedSync clients to HubSpot
const hubspot = require('@hubspot/api-client');

async function syncClientToHubSpot(weddingClient) {
  const hubspotClient = new hubspot.Client({
    apiKey: process.env.HUBSPOT_API_KEY
  });

  const contact = {
    properties: {
      email: weddingClient.contact_email,
      firstname: weddingClient.couple_name.split(' & ')[0],
      lastname: weddingClient.couple_name.split(' & ')[1],
      wedding_date: weddingClient.wedding_date,
      venue: weddingClient.venue_name,
      guest_count: weddingClient.guest_count,
      budget: weddingClient.budget_display,
      wedding_season: weddingClient.wedding_season,
      supplier_type: 'photographer', // Your supplier type
      planning_status: weddingClient.planning_status
    }
  };

  await hubspotClient.crm.contacts.basicApi.create(contact);
}

// Listen for new client webhooks from WedSync
app.post('/webhooks/wedsync', (req, res) => {
  const { event_type, data } = req.body;
  
  if (event_type === 'client.created') {
    syncClientToHubSpot(data.client);
  }
  
  res.status(200).send('OK');
});
```

### Salesforce Integration

Create Salesforce opportunities from wedding bookings with industry-specific fields.

```javascript
const jsforce = require('jsforce');

async function createSalesforceOpportunity(booking) {
  const conn = new jsforce.Connection({
    loginUrl: 'https://your-domain.my.salesforce.com'
  });

  await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);

  const opportunity = {
    Name: `Wedding - ${booking.couple_name}`,
    StageName: 'Booked',
    CloseDate: booking.wedding_date,
    Amount: booking.total_amount,
    Type: 'Wedding Service',
    Wedding_Season__c: booking.wedding_season,
    Venue__c: booking.venue_name,
    Guest_Count__c: booking.guest_count,
    Budget_Range__c: booking.budget_range,
    Planning_Status__c: booking.planning_status,
    Days_Until_Wedding__c: booking.days_until_wedding,
    Is_Peak_Season__c: booking.is_peak_season
  };

  const result = await conn.sobject('Opportunity').create(opportunity);
  return result;
}
```

### Tave Studio Manager Integration

WedSync provides native Tave integration for photographers using Tave Studio Manager.

```javascript
// Configure Tave integration
const taveConfig = {
  api_key: process.env.TAVE_API_KEY,
  studio_id: process.env.TAVE_STUDIO_ID,
  sync_direction: 'bidirectional', // Import from Tave and export to Tave
  field_mapping: {
    'client_name': 'couple_name',
    'event_date': 'wedding_date',
    'event_location': 'venue_name',
    'guest_count': 'guest_count',
    'package_name': 'package_tier'
  }
};

// Sync clients from Tave to WedSync
const taveSync = await fetch('https://api.wedsync.com/v1/integrations/tave/sync', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(taveConfig)
});
```

## Calendar Integration

### Google Calendar Integration

Sync wedding dates with your Google Calendar to avoid double bookings.

```javascript
const { google } = require('googleapis');

async function addWeddingToCalendar(booking) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `Wedding: ${booking.couple_name}`,
    location: booking.venue_name,
    description: `
      Couple: ${booking.couple_name}
      Guests: ${booking.guest_count}
      Package: ${booking.package_tier}
      Season: ${booking.wedding_season}
      Planning Status: ${booking.planning_status}
      Special requests: ${booking.special_requests || 'None'}
    `,
    start: {
      dateTime: booking.wedding_date,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: new Date(new Date(booking.wedding_date).getTime() + 8 * 60 * 60 * 1000), // 8 hours later
      timeZone: 'Europe/London',
    },
    attendees: [
      { email: booking.contact_email }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        {'method': 'email', 'minutes': 24 * 60}, // 1 day before
        {'method': 'popup', 'minutes': 60}, // 1 hour before
      ],
    },
    colorId: booking.is_peak_season ? '5' : '1' // Different colors for peak season
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return response.data;
}
```

### Outlook Calendar Integration

```javascript
const { Client } = require('@azure/msal-node');

async function addWeddingToOutlook(booking) {
  const event = {
    subject: `Wedding: ${booking.couple_name}`,
    body: {
      contentType: 'HTML',
      content: `
        <h3>Wedding Details</h3>
        <p><strong>Couple:</strong> ${booking.couple_name}</p>
        <p><strong>Venue:</strong> ${booking.venue_name}</p>
        <p><strong>Guests:</strong> ${booking.guest_count}</p>
        <p><strong>Season:</strong> ${booking.wedding_season}</p>
        <p><strong>Planning Status:</strong> ${booking.planning_status}</p>
      `
    },
    start: {
      dateTime: booking.wedding_date,
      timeZone: 'Europe/London'
    },
    end: {
      dateTime: new Date(new Date(booking.wedding_date).getTime() + 8 * 60 * 60 * 1000),
      timeZone: 'Europe/London'
    },
    location: {
      displayName: booking.venue_name
    },
    attendees: [
      {
        type: 'required',
        emailAddress: {
          address: booking.contact_email,
          name: booking.couple_name
        }
      }
    ]
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${outlookAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  return response.json();
}
```

## Payment Integration

### Stripe Integration

Process wedding payments with full integration to WedSync client data.

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createWeddingPayment(booking) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.total_amount * 100, // Convert to pence
    currency: 'gbp',
    metadata: {
      booking_id: booking.id,
      couple_name: booking.couple_name,
      wedding_date: booking.wedding_date,
      wedding_season: booking.wedding_season,
      supplier_type: 'photographer',
      venue: booking.venue_name,
      guest_count: booking.guest_count.toString(),
      is_peak_season: booking.is_peak_season.toString()
    },
    description: `Wedding photography for ${booking.couple_name}`,
    receipt_email: booking.contact_email
  });

  // Update WedSync with payment intent
  await fetch(`https://api.wedsync.com/v1/bookings/${booking.id}/payment`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      payment_intent_id: paymentIntent.id,
      amount: booking.total_amount,
      currency: 'gbp',
      status: 'pending'
    })
  });

  return paymentIntent;
}

// Handle successful payments
app.post('/webhooks/stripe', (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'payment_intent.succeeded') {
    const paymentIntent = data.object;
    const bookingId = paymentIntent.metadata.booking_id;
    
    // Update WedSync booking status
    fetch(`https://api.wedsync.com/v1/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_status: 'paid',
        status: 'confirmed'
      })
    });
  }
  
  res.status(200).send('OK');
});
```

### PayPal Integration

```javascript
const paypal = require('@paypal/checkout-server-sdk');

async function createPayPalPayment(booking) {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'GBP',
        value: booking.total_amount.toString(),
        breakdown: {
          item_total: {
            currency_code: 'GBP',
            value: booking.total_amount.toString()
          }
        }
      },
      items: [{
        name: `Wedding ${booking.supplier_type} for ${booking.couple_name}`,
        unit_amount: {
          currency_code: 'GBP',
          value: booking.total_amount.toString()
        },
        quantity: '1',
        description: `Wedding date: ${booking.wedding_date}, Venue: ${booking.venue_name}`,
        category: 'DIGITAL_GOODS'
      }],
      custom_id: booking.id,
      description: `Wedding service for ${booking.couple_name}`
    }],
    application_context: {
      brand_name: 'Your Wedding Business',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW'
    }
  });

  const order = await client.execute(request);
  return order.result;
}
```

## Email Marketing Integration

### Mailchimp Integration

Segment wedding couples by season, budget, and planning status for targeted marketing.

```javascript
const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: 'us1' // Your server prefix
});

async function addCoupleToMailchimp(client) {
  const memberInfo = {
    email_address: client.contact_email,
    status: 'subscribed',
    merge_fields: {
      FNAME: client.couple_name.split(' & ')[0],
      LNAME: client.couple_name.split(' & ')[1] || '',
      WDATE: client.wedding_date,
      VENUE: client.venue_name,
      GUESTS: client.guest_count.toString(),
      BUDGET: client.budget_display,
      SEASON: client.wedding_season,
      PLANNING: client.planning_status
    },
    tags: [
      client.wedding_season,
      client.budget_range,
      client.planning_status,
      client.is_peak_season ? 'peak-season' : 'off-season'
    ]
  };

  const response = await mailchimp.lists.addListMember('YOUR_LIST_ID', memberInfo);
  return response;
}

// Create seasonal campaigns
async function createSeasonalCampaign(season) {
  const campaign = {
    type: 'regular',
    recipients: {
      list_id: 'YOUR_LIST_ID',
      segment_opts: {
        match: 'all',
        conditions: [{
          condition_type: 'TextMerge',
          field: 'SEASON',
          op: 'is',
          value: season
        }]
      }
    },
    settings: {
      subject_line: `Perfect ${season} Wedding Ideas`,
      title: `${season} Wedding Campaign`,
      from_name: 'Your Wedding Business',
      reply_to: 'hello@yourweddingbusiness.com'
    }
  };

  const response = await mailchimp.campaigns.create(campaign);
  return response;
}
```

### Constant Contact Integration

```javascript
const constantContact = require('constant-contact');

async function syncToConstantContact(client) {
  const contact = {
    email_address: {
      address: client.contact_email,
      permission_to_send: 'implicit'
    },
    first_name: client.couple_name.split(' & ')[0],
    last_name: client.couple_name.split(' & ')[1] || '',
    custom_fields: [{
      custom_field_id: 'wedding_date',
      value: client.wedding_date
    }, {
      custom_field_id: 'venue',
      value: client.venue_name
    }, {
      custom_field_id: 'guest_count',
      value: client.guest_count.toString()
    }, {
      custom_field_id: 'wedding_season',
      value: client.wedding_season
    }],
    list_memberships: [
      client.is_peak_season ? 'peak_season_list_id' : 'off_season_list_id'
    ]
  };

  const response = await constantContact.contacts.create(contact);
  return response;
}
```

## Social Media Integration

### Instagram Business Integration

Share wedding content and tag couples automatically.

```javascript
const instagram = require('instagram-basic-display-api');

async function shareWeddingContent(booking, imageUrl, caption) {
  const hashtags = [
    `#${booking.wedding_season}wedding`,
    `#${booking.venue_name.replace(/\s+/g, '').toLowerCase()}`,
    '#weddingphotography',
    booking.is_peak_season ? '#peakseason' : '#offseason',
    `#${booking.guest_count < 50 ? 'intimate' : booking.guest_count > 150 ? 'large' : 'medium'}wedding`
  ];

  const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;

  const mediaObject = await instagram.media.create({
    image_url: imageUrl,
    caption: fullCaption
  });

  return await instagram.media.publish(mediaObject.id);
}
```

## Booking Platform Integration

### WeddingWire Integration

Sync leads from WeddingWire into WedSync client management.

```javascript
async function importWeddingWireLeads() {
  // WeddingWire API integration (requires API access)
  const leads = await fetch('https://api.weddingwire.com/leads', {
    headers: {
      'Authorization': 'Bearer WEDDINGWIRE_API_TOKEN'
    }
  });

  const leadsData = await leads.json();

  for (const lead of leadsData.leads) {
    const client = {
      couple_name: `${lead.bride_name} & ${lead.groom_name}`,
      wedding_date: lead.wedding_date,
      venue_name: lead.venue,
      guest_count: lead.guest_count,
      budget_range: mapBudgetRange(lead.budget),
      contact_email: lead.email,
      contact_phone: lead.phone,
      source: 'WeddingWire',
      lead_status: 'inquiry'
    };

    // Create client in WedSync
    await fetch('https://api.wedsync.com/v1/suppliers/me/clients', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(client)
    });
  }
}

function mapBudgetRange(budget) {
  if (budget < 1000) return 'under_1000';
  if (budget < 2500) return '1000_2500';
  if (budget < 5000) return '2500_5000';
  if (budget < 10000) return '5000_10000';
  return '10000_plus';
}
```

## Zapier Integration Templates

### Popular Zap Templates

#### 1. New Client → Send Welcome Email
- **Trigger**: New client created in WedSync
- **Action**: Send personalized email via Gmail/Outlook
- **Data**: Client name, wedding date, venue, season

#### 2. Wedding Inquiry → Add to Spreadsheet
- **Trigger**: New form submission in WedSync
- **Action**: Add row to Google Sheets/Excel
- **Data**: All form fields plus wedding calculations

#### 3. Payment Received → Update Project Management
- **Trigger**: Payment confirmed in WedSync
- **Action**: Create project in Asana/Trello
- **Data**: Client details, wedding timeline, package info

#### 4. Wedding Date Approaching → Send Reminder
- **Trigger**: 30 days before wedding
- **Action**: Send SMS via Twilio
- **Data**: Final preparation reminders

### Custom Zapier Integration

```javascript
// Custom Zapier webhook integration
app.post('/zapier/webhook', (req, res) => {
  const { event_type, data, wedding_context } = req.body;
  
  // Format data for Zapier
  const zapierPayload = {
    event: event_type,
    couple_name: data.couple_name,
    wedding_date: data.wedding_date,
    venue: data.venue_name,
    guest_count: data.guest_count,
    budget: data.budget_display,
    season: wedding_context.wedding_season,
    days_until_wedding: wedding_context.days_until_wedding,
    is_peak_season: wedding_context.is_peak_season,
    urgency: wedding_context.urgency_level
  };

  // Send to configured Zapier webhook URLs
  const zapierWebhooks = process.env.ZAPIER_WEBHOOK_URLS.split(',');
  
  zapierWebhooks.forEach(async (webhookUrl) => {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapierPayload)
    });
  });

  res.status(200).send('Zapier webhooks sent');
});
```

## Workflow Automation Examples

### Complete Wedding Journey Automation

```javascript
class WeddingJourneyAutomation {
  constructor(weddingClient) {
    this.client = weddingClient;
    this.milestones = this.calculateMilestones();
  }

  calculateMilestones() {
    const weddingDate = new Date(this.client.wedding_date);
    const today = new Date();
    
    return {
      initial_inquiry: today,
      contract_sent: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
      deposit_due: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week
      planning_session: new Date(weddingDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 2 months before
      final_details: new Date(weddingDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks before
      wedding_day: weddingDate,
      delivery: new Date(weddingDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 1 month after
    };
  }

  async executeWorkflow() {
    // Send welcome email
    await this.sendWelcomeEmail();
    
    // Schedule follow-up tasks
    await this.scheduleContractDelivery();
    await this.schedulePaymentReminders();
    await this.schedulePlanningSession();
    await this.scheduleDeliveryReminders();
    
    // Set up milestone notifications
    await this.setupMilestoneNotifications();
  }

  async sendWelcomeEmail() {
    const emailContent = `
      Dear ${this.client.couple_name},
      
      Thank you for choosing us for your ${this.client.wedding_season} wedding at ${this.client.venue_name}!
      
      We're excited to work with you and capture your special day on ${new Date(this.client.wedding_date).toDateString()}.
      
      Your wedding is ${this.client.days_until_wedding} days away, and we'll be in touch with next steps soon.
      
      Best regards,
      Your Wedding Photography Team
    `;

    await this.sendEmail(this.client.contact_email, 'Welcome to Your Wedding Journey!', emailContent);
  }

  async scheduleContractDelivery() {
    const deliveryDate = this.milestones.contract_sent;
    
    // Schedule automated contract delivery
    await this.scheduleTask(deliveryDate, 'SEND_CONTRACT', {
      client_id: this.client.id,
      template: 'wedding_photography_contract',
      package: this.client.package_tier
    });
  }

  async setupMilestoneNotifications() {
    const notifications = [
      {
        date: this.milestones.planning_session,
        type: 'PLANNING_SESSION_REMINDER',
        recipients: ['supplier', 'client']
      },
      {
        date: this.milestones.final_details,
        type: 'FINAL_DETAILS_REQUEST',
        recipients: ['client']
      },
      {
        date: new Date(this.milestones.wedding_day.getTime() - 24 * 60 * 60 * 1000),
        type: 'WEDDING_DAY_PREPARATION',
        recipients: ['supplier']
      }
    ];

    for (const notification of notifications) {
      await this.scheduleNotification(notification);
    }
  }
}

// Usage
app.post('/webhooks/wedsync', async (req, res) => {
  const { event_type, data } = req.body;
  
  if (event_type === 'client.created') {
    const automation = new WeddingJourneyAutomation(data.client);
    await automation.executeWorkflow();
  }
  
  res.status(200).send('OK');
});
```

## Error Handling and Resilience

### Retry Logic for API Calls

```javascript
class WedSyncAPIClient {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.wedsync.com/v1';
  }

  async makeRequest(endpoint, options = {}, retries = 3) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (response.ok) {
          return await response.json();
        }
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 60;
          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          await this.sleep(retryAfter * 1000);
          continue;
        }
        
        // Handle server errors with exponential backoff
        if (response.status >= 500) {
          const backoffDelay = Math.pow(2, attempt) * 1000;
          console.log(`Server error. Retrying in ${backoffDelay}ms...`);
          await this.sleep(backoffDelay);
          continue;
        }
        
        // Client errors shouldn't be retried
        throw new Error(`API error: ${response.status} ${response.statusText}`);
        
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        console.log(`Request failed (attempt ${attempt}/${retries}): ${error.message}`);
        await this.sleep(1000 * attempt);
      }
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getClients(filters = {}) {
    return this.makeRequest('/suppliers/me/clients', {
      method: 'GET',
      query: new URLSearchParams(filters).toString()
    });
  }

  async createClient(clientData) {
    return this.makeRequest('/suppliers/me/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }
}
```

## Monitoring and Analytics

### Track Integration Health

```javascript
class IntegrationMonitor {
  constructor() {
    this.metrics = {
      api_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      average_response_time: 0,
      last_sync_time: null
    };
  }

  async trackAPICall(apiCall) {
    const startTime = Date.now();
    this.metrics.api_calls++;

    try {
      const result = await apiCall();
      this.metrics.successful_calls++;
      
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      
      return result;
    } catch (error) {
      this.metrics.failed_calls++;
      console.error('API call failed:', error);
      throw error;
    }
  }

  updateAverageResponseTime(responseTime) {
    const totalCalls = this.metrics.successful_calls;
    const currentAvg = this.metrics.average_response_time;
    
    this.metrics.average_response_time = 
      (currentAvg * (totalCalls - 1) + responseTime) / totalCalls;
  }

  getHealthStatus() {
    const successRate = this.metrics.successful_calls / this.metrics.api_calls * 100;
    
    return {
      success_rate: successRate,
      average_response_time: this.metrics.average_response_time,
      total_calls: this.metrics.api_calls,
      last_sync: this.metrics.last_sync_time,
      status: successRate > 95 ? 'healthy' : successRate > 80 ? 'degraded' : 'unhealthy'
    };
  }
}
```

## Security Best Practices

### Secure Token Storage

```javascript
// Use environment variables for sensitive data
const config = {
  wedsync_token: process.env.WEDSYNC_API_TOKEN,
  webhook_secret: process.env.WEDSYNC_WEBHOOK_SECRET,
  encryption_key: process.env.ENCRYPTION_KEY
};

// Encrypt sensitive client data before storing
const crypto = require('crypto');

function encryptSensitiveData(data) {
  const cipher = crypto.createCipher('aes-256-cbc', config.encryption_key);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptSensitiveData(encryptedData) {
  const decipher = crypto.createDecipher('aes-256-cbc', config.encryption_key);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}
```

### Webhook Signature Verification

```javascript
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  const actualSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(actualSignature, 'hex')
  );
}

app.post('/webhooks/wedsync', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-wedsync-signature'];
  const payload = req.body;
  
  if (!verifyWebhookSignature(payload, signature, config.webhook_secret)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook safely
  const data = JSON.parse(payload);
  // ... handle webhook data
  
  res.status(200).send('OK');
});
```

## Support and Resources

### Getting Help

- **Integration Support**: integration-help@wedsync.com
- **Technical Documentation**: https://docs.wedsync.com/integrations
- **API Status**: https://status.wedsync.com
- **Developer Community**: https://community.wedsync.com

### Sample Integration Projects

Visit our GitHub repository for complete integration examples:
- **HubSpot Wedding CRM**: https://github.com/wedsync/hubspot-integration
- **Tave Studio Manager**: https://github.com/wedsync/tave-sync
- **Google Calendar Sync**: https://github.com/wedsync/calendar-integration
- **Stripe Payments**: https://github.com/wedsync/stripe-wedding-payments

### Integration Testing

Use our sandbox environment for testing:
- **Sandbox API**: https://sandbox-api.wedsync.com/v1
- **Test Webhooks**: https://webhook.site for testing webhook deliveries
- **Mock Data**: Available in sandbox for realistic testing

---

*This guide is regularly updated. For the latest integration patterns and best practices, visit our documentation at https://docs.wedsync.com/integrations*