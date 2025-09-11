# 🔌 WedSync Integration Architecture
**Version:** 1.0  
**Last Updated:** January 13, 2025  
**Priority:** HIGH - Required for MVP

---

## 🎯 Integration Strategy Overview

### **Core Principle**
"Start simple, scale later. Use managed services to avoid complexity."

### **MVP Integrations (MUST HAVE)**
1. **Stripe** - Payment processing
2. **SendGrid** - Email delivery  
3. **Twilio** - SMS messaging
4. **Google Cloud Vision** - PDF OCR

### **Phase 2 Integrations (NICE TO HAVE)**
1. **Tave** - CRM sync (25% of photographers use)
2. **Google Calendar** - Schedule sync
3. **Zapier** - General automation
4. **HoneyBook** - Competitor migration

---

## 💳 Stripe Integration (Payments)

### **What It Does**
- Processes subscription payments
- Manages billing cycles
- Handles payment methods
- Sends invoices
- Manages refunds

### **Implementation Plan**

#### **1. Account Setup**
```bash
# Required Stripe Products
- Stripe Checkout (pre-built payment UI)
- Stripe Billing (subscription management)
- Stripe Customer Portal (self-service)
- Webhook endpoints
```

#### **2. Database Schema**
```sql
-- Already exists in Supabase
organizations table:
  stripe_customer_id VARCHAR(255)
  stripe_subscription_id VARCHAR(255)
  subscription_status VARCHAR(50)
  pricing_tier ENUM
```

#### **3. API Routes Required**
```typescript
/api/stripe/
  ├── create-checkout-session.ts  // Start subscription
  ├── create-portal-session.ts    // Manage subscription
  ├── webhook.ts                   // Handle Stripe events
  └── usage-report.ts             // Report usage for metered billing
```

#### **4. Webhook Events to Handle**
```javascript
// Critical events for MVP
- checkout.session.completed     // New subscription
- customer.subscription.updated  // Plan changes
- customer.subscription.deleted  // Cancellation
- invoice.payment_failed        // Payment issues
```

#### **5. Implementation Code Structure**
```typescript
// /app/api/stripe/create-checkout-session/route.ts
export async function POST(request: Request) {
  // 1. Get user and organization
  // 2. Create/get Stripe customer
  // 3. Create checkout session
  // 4. Return checkout URL
}

// Price IDs (from Stripe Dashboard)
const PRICES = {
  FREE: null,
  PROFESSIONAL: 'price_xxxxx',  // $49/month
  SCALE: 'price_yyyyy'          // $99/month
}
```

### **Security Requirements**
- ✅ Never store card details
- ✅ Use webhook signatures
- ✅ Implement idempotency keys
- ✅ PCI compliance via Stripe

### **Testing Checklist**
- [ ] Test card: 4242 4242 4242 4242
- [ ] Subscription creation works
- [ ] Plan upgrade/downgrade works
- [ ] Cancellation works
- [ ] Failed payment handling
- [ ] Invoice email delivery

---

## 📧 SendGrid Integration (Email)

### **What It Does**
- Sends transactional emails
- Tracks delivery/opens/clicks
- Manages templates
- Handles unsubscribes

### **Implementation Plan**

#### **1. Account Setup**
```bash
# SendGrid Configuration
- API Key with full access
- Sender authentication (domain verification)
- IP warming (if dedicated IP)
- Suppression lists configured
```

#### **2. Email Templates Required**
```typescript
// MVP Email Templates
const TEMPLATES = {
  // Account emails
  WELCOME: 'd-xxxxx',           // New user welcome
  PASSWORD_RESET: 'd-yyyyy',     // Password reset
  
  // Transactional emails
  FORM_SUBMITTED: 'd-zzzzz',     // Form submission confirm
  FORM_SHARED: 'd-aaaaa',        // Form shared with couple
  
  // Journey emails
  JOURNEY_EMAIL: 'd-bbbbb',      // Generic journey email
  
  // Billing emails
  TRIAL_ENDING: 'd-ccccc',       // Trial expiry warning
  PAYMENT_FAILED: 'd-ddddd'      // Payment failure
}
```

#### **3. Email Service Structure**
```typescript
// /lib/email/sendgrid.ts
class EmailService {
  async sendEmail(
    to: string,
    templateId: string,
    dynamicData: object
  ) {
    // 1. Check suppression list
    // 2. Apply rate limiting
    // 3. Send via SendGrid API
    // 4. Log to database
    // 5. Handle errors
  }
  
  async sendBulkEmail(
    recipients: Array<{email: string, data: object}>,
    templateId: string
  ) {
    // Batch send for journeys
  }
}
```

#### **4. Dynamic Template Variables**
```javascript
// Common template variables
{
  vendor_name: "Sarah's Photography",
  couple_names: "Emma & James",
  wedding_date: "June 15, 2025",
  form_link: "https://app.wedsync.com/f/abc123",
  unsubscribe_link: "{{unsubscribe}}"  // SendGrid handles
}
```

### **Deliverability Best Practices**
- ✅ Verify domain (SPF, DKIM, DMARC)
- ✅ Use dedicated IP for volume > 50k/month
- ✅ Implement double opt-in
- ✅ Honor unsubscribes immediately
- ✅ Monitor bounce rates

### **Testing Checklist**
- [ ] Welcome email sends on signup
- [ ] Form submission notifications work
- [ ] Journey emails trigger correctly
- [ ] Unsubscribe links work
- [ ] Email logs properly stored

---

## 📱 Twilio Integration (SMS)

### **What It Does**
- Sends SMS notifications
- Handles two-way messaging
- Provides delivery reports
- Manages opt-outs

### **Implementation Plan**

#### **1. Account Setup**
```bash
# Twilio Configuration
- Account SID
- Auth Token  
- Phone number (toll-free recommended)
- Messaging service (for scaling)
```

#### **2. SMS Templates**
```typescript
// SMS are limited to 160 characters
const SMS_TEMPLATES = {
  FORM_REMINDER: "Hi {{name}}! Reminder to complete your wedding details form: {{link}}",
  
  PAYMENT_DUE: "Payment reminder: Your wedding photos invoice is due tomorrow. Pay here: {{link}}",
  
  WEDDING_COUNTDOWN: "{{days}} days until your wedding! Complete final details: {{link}}"
}
```

#### **3. SMS Service Structure**
```typescript
// /lib/sms/twilio.ts
class SMSService {
  async sendSMS(
    to: string,
    message: string,
    organizationId: string
  ) {
    // 1. Check opt-out status
    // 2. Check SMS credits (tier limit)
    // 3. Format phone number
    // 4. Send via Twilio
    // 5. Deduct credits
    // 6. Log delivery
  }
  
  async handleInbound(
    from: string,
    body: string
  ) {
    // Handle STOP, START, HELP
  }
}
```

#### **4. Credit System**
```typescript
// SMS credits per tier
const SMS_CREDITS = {
  FREE: 0,
  PROFESSIONAL: 100,  // per month
  SCALE: 500          // per month
}

// Track usage in database
sms_usage table:
  organization_id
  month
  credits_used
  credits_limit
```

### **Compliance Requirements**
- ✅ Include opt-out instructions
- ✅ Honor STOP immediately
- ✅ Never text before 8am or after 9pm
- ✅ Get explicit consent
- ✅ Keep message logs

### **Testing Checklist**
- [ ] SMS sends successfully
- [ ] Credits deduct correctly
- [ ] Opt-out (STOP) works
- [ ] International numbers handled
- [ ] Rate limiting enforced

---

## 🔍 Google Cloud Vision (OCR)

### **What It Does**
- Extracts text from PDFs
- Identifies form fields
- Detects signatures
- Recognizes checkboxes

### **Implementation Plan**

#### **1. Account Setup**
```bash
# Google Cloud Configuration
- Create project
- Enable Vision API
- Create service account
- Download credentials JSON
- Set up billing alerts
```

#### **2. OCR Processing Flow**
```typescript
// /lib/ocr/google-vision.ts
class OCRService {
  async processPDF(
    fileUrl: string,
    organizationId: string
  ) {
    // 1. Download PDF from Supabase
    // 2. Convert to images if needed
    // 3. Send to Vision API
    // 4. Parse response
    // 5. Identify form fields
    // 6. Return structured data
  }
  
  async detectFields(
    text: string,
    coordinates: object
  ) {
    // Use AI to identify:
    // - Names (bride, groom)
    // - Dates (wedding, contract)
    // - Venues
    // - Prices
    // - Signatures
  }
}
```

#### **3. Field Mapping Interface**
```typescript
// Detected fields structure
interface DetectedField {
  type: 'text' | 'date' | 'number' | 'signature'
  label: string
  value: string
  confidence: number
  coordinates: {x: number, y: number, width: number, height: number}
}

// User can correct/map fields
interface FieldMapping {
  detected: DetectedField
  mapped_to: string  // Form field ID
  confirmed: boolean
}
```

### **Cost Management**
- First 1000 pages/month FREE
- $1.50 per 1000 pages after
- Cache results to avoid re-processing
- Implement usage limits per tier

### **Testing Checklist**
- [ ] PDF upload works
- [ ] Text extraction accurate
- [ ] Field detection reasonable
- [ ] Signature detection works
- [ ] Error handling graceful

---

## 🔄 Tave Integration (Phase 2)

### **What It Does**
- Syncs client data
- Imports bookings
- Updates project status
- Shares documents

### **Implementation Approach**
```typescript
// Tave uses REST API v2
class TaveIntegration {
  // API Endpoints
  baseUrl = 'https://api.tave.com/v2'
  
  // Key endpoints to integrate
  endpoints = {
    contacts: '/contacts',
    jobs: '/jobs',
    invoices: '/invoices',
    questionnaires: '/questionnaires'
  }
  
  // Sync strategy
  async syncData() {
    // 1. Webhook for real-time updates
    // 2. Daily batch sync as backup
    // 3. Manual sync button
  }
}
```

---

## 🏗️ Integration Infrastructure

### **Environment Variables**
```bash
# .env.local
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=hello@wedsync.com
SENDGRID_FROM_NAME=WedSync

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_CLOUD_PROJECT=wedsync-xxxxx
```

### **Error Handling Strategy**
```typescript
// Consistent error handling
class IntegrationError extends Error {
  constructor(
    public service: string,
    public code: string,
    public retryable: boolean
  ) {
    super(`${service} error: ${code}`)
  }
}

// Retry logic for transient failures
async function withRetry(
  fn: Function,
  maxRetries = 3
) {
  // Exponential backoff
  // Circuit breaker pattern
  // Error reporting to Sentry
}
```

### **Monitoring & Logging**
```typescript
// Track all integration events
integration_logs table:
  id
  service (stripe|sendgrid|twilio|vision)
  event_type
  status (success|failure)
  metadata JSONB
  created_at
  
// Key metrics to monitor
- API response times
- Error rates by service
- Credit/usage consumption
- Webhook delivery rates
```

---

## 📋 Implementation Checklist

### **Week 1: Payment Infrastructure**
- [ ] Set up Stripe account
- [ ] Create products and prices
- [ ] Implement checkout flow
- [ ] Test subscription lifecycle
- [ ] Add webhook handlers

### **Week 2: Communications**
- [ ] Configure SendGrid
- [ ] Create email templates
- [ ] Set up Twilio
- [ ] Build notification system
- [ ] Test delivery

### **Week 3: OCR Feature**
- [ ] Set up Google Cloud
- [ ] Build upload interface
- [ ] Implement OCR processing
- [ ] Create field mapping UI
- [ ] Test with real PDFs

### **Post-MVP: CRM Sync**
- [ ] Research Tave API
- [ ] Build sync mechanism
- [ ] Handle conflicts
- [ ] Test with real data

---

## 🎯 Success Criteria

### **Integration Health Metrics**
- Payment success rate > 95%
- Email delivery rate > 98%
- SMS delivery rate > 95%
- OCR accuracy > 80%
- API response time < 500ms
- Zero data loss
- Graceful degradation

---

*"Integrations are like wedding vendors - they need to work together seamlessly or the whole event falls apart."*