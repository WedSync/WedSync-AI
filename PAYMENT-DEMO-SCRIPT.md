# 🎯 WedSync Payment System - Demo & Testing Script

**Purpose:** Step-by-step guide to demonstrate and test the payment system  
**Duration:** ~30 minutes  
**Prerequisites:** Development environment running on localhost:3001

---

## 🚀 Quick Start

```bash
# Terminal 1: Start the development server
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync
npm run dev

# Terminal 2: Run verification scripts
npm run verify:payments  # (if script exists)
# OR
npx tsx scripts/verify-payment-tables.ts
npx tsx scripts/test-payment-flow.ts
```

---

## 📋 Demo Scenario: Wedding Photographer Upgrading to Professional

### **Cast of Characters:**
- **Sarah Chen** - Wedding photographer (our user)
- **WedSync** - Our platform
- **Stripe** - Payment processor

---

## Act 1: The Discovery 🔍

### Scene 1: Sarah Visits Pricing Page

**Navigate to:** `http://localhost:3001/pricing`

**What to Show:**
1. Three clear pricing tiers
2. Feature comparison table
3. "Most Popular" badge on Professional tier
4. Monthly/Annual toggle (if implemented)

**Demo Talk Track:**
> "Sarah is a wedding photographer who's been using our free tier. She's hitting the 1-form limit and needs to upgrade."

**Current State Check:**
```bash
# Check if pricing page loads
curl http://localhost:3001/pricing -I
# Expected: 200 OK
```

---

## Act 2: The Upgrade Journey 💳

### Scene 2: Initiating Checkout

**User Actions:**
1. Click "Upgrade to Professional" button
2. (Should be redirected to login if not authenticated)
3. Enter login credentials
4. Return to checkout

**What SHOULD Happen:**
```javascript
// Behind the scenes
POST /api/stripe/create-checkout-session
{
  "priceId": "price_1234_professional_monthly",
  "successUrl": "http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "http://localhost:3001/pricing"
}

// Response
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123"
}
```

**Current Issues to Demonstrate:**
- ❌ No authentication required (SECURITY ISSUE)
- ❌ Any priceId accepted (VALIDATION ISSUE)
- ⚠️ Success page doesn't exist

### Scene 3: Stripe Checkout

**Test Card Numbers:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Expired: 4000 0000 0000 0069
3D Secure: 4000 0025 0000 3155
```

**Demo Steps:**
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any ZIP code
5. Complete checkout

---

## Act 3: The Webhook Dance 🔄

### Scene 4: Payment Processing

**What Happens Behind the Scenes:**

```bash
# Stripe sends webhook to our endpoint
POST /api/stripe/webhook

Headers:
  stripe-signature: t=timestamp,v1=signature

Body:
{
  "id": "evt_123",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "customer": "cus_123",
      "subscription": "sub_123",
      "payment_status": "paid"
    }
  }
}
```

**Database Updates (What SHOULD Happen):**

```sql
-- 1. Record payment
INSERT INTO payment_history (
  organization_id,
  stripe_charge_id,
  customer_id,
  amount,
  status
) VALUES (...);

-- 2. Update subscription
UPDATE organizations 
SET pricing_tier = 'professional',
    stripe_subscription_id = 'sub_123'
WHERE id = 'org_id';

-- 3. Log webhook event
INSERT INTO webhook_events (
  stripe_event_id,
  event_type,
  processed_at
) VALUES (...);
```

**Current Issues:**
- ❌ Updates wrong table (users instead of organizations)
- ❌ No idempotency check
- ❌ Missing payment_history table (now fixed!)

---

## 🧪 Manual Testing Checklist

### Basic Flow Testing

```bash
# 1. Test pricing page loads
open http://localhost:3001/pricing

# 2. Test checkout session creation (will fail without auth)
curl -X POST http://localhost:3001/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_professional",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/pricing"
  }'

# 3. Test webhook endpoint (will fail without valid signature)
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{
    "id": "evt_test",
    "type": "invoice.payment_succeeded"
  }'
```

### Database Verification

```sql
-- Connect to Supabase SQL editor or use psql

-- 1. Check payment tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%payment%' OR table_name LIKE '%invoice%';

-- 2. Verify an organization exists
SELECT id, name, pricing_tier, stripe_customer_id 
FROM organizations LIMIT 5;

-- 3. Check payment history (should be empty initially)
SELECT * FROM payment_history LIMIT 5;

-- 4. Check webhook events
SELECT stripe_event_id, event_type, processed_at 
FROM webhook_events 
ORDER BY processed_at DESC LIMIT 5;
```

---

## 🔥 Stress Testing

### Rate Limiting Test
```bash
# Run 10 requests rapidly (should hit rate limit after 5)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"priceId": "test"}' &
done
wait
```

### Performance Test
```bash
# Measure response time
time curl -X POST http://localhost:3001/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId": "test"}'

# Should be < 500ms
```

---

## 🎬 Demo Script for Stakeholders

### 1. Opening (2 minutes)
> "Today I'll demonstrate our payment system implementation for WedSync. We've built a Stripe integration that handles subscription management for our three pricing tiers."

### 2. Show Pricing Page (3 minutes)
- Navigate to `/pricing`
- Highlight the three tiers
- Explain the value proposition
- Show responsive design on mobile

### 3. Demonstrate Upgrade Flow (5 minutes)
- Click upgrade button
- Show Stripe checkout (use test card)
- Complete payment
- Show success confirmation

### 4. Backend Verification (5 minutes)
- Open database viewer
- Show payment_history record
- Show organization tier updated
- Show webhook event logged

### 5. Security Features (3 minutes)
- Demonstrate rate limiting
- Show webhook signature validation
- Explain RLS policies

### 6. Current Limitations (2 minutes)
> "We've identified several areas for improvement:"
- Authentication on checkout endpoint
- Idempotency protection
- User-facing subscription management

### 7. Next Steps (2 minutes)
- Timeline for fixes (2-3 days)
- Full feature completion (2 weeks)
- Production readiness checklist

---

## 🐛 Troubleshooting Common Issues

### Issue: "Cannot connect to database"
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify .env.local exists
ls -la | grep env
```

### Issue: "Stripe webhook failing"
```bash
# Check webhook endpoint URL in Stripe dashboard
# Should be: https://your-domain.com/api/stripe/webhook

# Test locally with Stripe CLI
stripe listen --forward-to localhost:3001/api/stripe/webhook
stripe trigger payment_intent.succeeded
```

### Issue: "Checkout session not creating"
```javascript
// Check Stripe keys are set
console.log('Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);

// Verify price IDs match Stripe dashboard
// Go to: https://dashboard.stripe.com/prices
```

---

## 📊 Monitoring Dashboard

### Key Metrics to Track:

```sql
-- Daily Revenue
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transactions,
  SUM(amount) / 100.0 as revenue_gbp
FROM payment_history
WHERE status = 'succeeded'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Active Subscriptions by Tier
SELECT 
  pricing_tier,
  COUNT(*) as count
FROM organizations
WHERE pricing_tier IS NOT NULL
GROUP BY pricing_tier;

-- Failed Payments
SELECT 
  DATE(created_at) as date,
  COUNT(*) as failed_payments,
  SUM(amount) / 100.0 as failed_revenue_gbp
FROM payment_history
WHERE status = 'failed'
GROUP BY DATE(created_at);

-- Webhook Processing Health
SELECT 
  event_type,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM webhook_events
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

---

## 🚀 Production Deployment Checklist

Before going live, ensure:

### Environment Setup
- [ ] Production Stripe keys configured
- [ ] Webhook endpoint registered in Stripe
- [ ] SSL certificate active (HTTPS only)
- [ ] Environment variables secured

### Code Fixes
- [ ] Authentication implemented on checkout
- [ ] Idempotency protection added
- [ ] Correct database tables referenced
- [ ] Price validation implemented

### Testing
- [ ] All test scenarios pass
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Error handling verified

### Monitoring
- [ ] Logging configured
- [ ] Alerts set up for failures
- [ ] Metrics dashboard created
- [ ] Support runbook written

### Legal/Compliance
- [ ] Terms of Service updated
- [ ] Privacy Policy includes payment data
- [ ] GDPR compliance verified
- [ ] PCI compliance documented

---

## 📞 Support Scenarios

### Customer: "I was charged twice"
1. Check payment_history for duplicate transactions
2. Look for duplicate webhook events
3. Verify idempotency protection is working
4. Issue refund if needed via Stripe dashboard

### Customer: "My subscription isn't active"
1. Check organizations table for pricing_tier
2. Verify webhook was processed
3. Check for failed webhook events
4. Manually sync if needed

### Customer: "I can't upgrade"
1. Check browser console for errors
2. Verify authentication is working
3. Check rate limiting isn't blocking
4. Test with different payment method

---

## 🎉 Success Criteria

The demo is successful if:
1. ✅ Checkout flow completes end-to-end
2. ✅ Payment is recorded in database
3. ✅ Organization tier is updated
4. ✅ Webhook event is logged
5. ✅ No security vulnerabilities exposed
6. ✅ Performance meets < 500ms target

---

## 📚 Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Webhook Testing with CLI](https://stripe.com/docs/webhooks/test)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

*Demo script prepared for WedSync payment system testing*  
*Last updated: January 14, 2025*