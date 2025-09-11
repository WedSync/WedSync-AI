# 💳 Stripe Setup Guide for WedSync
**Complete instructions for setting up Stripe with 5-tier GBP pricing**

---

## 📋 Prerequisites

- Stripe account (create at https://stripe.com)
- Access to Stripe Dashboard
- Admin access to WedSync codebase

---

## 🚀 Step 1: Create Products in Stripe Dashboard

### Navigate to Products Section
1. Log into Stripe Dashboard
2. Go to **Products** → **+ Add Product**

### Create Each Product

#### 1️⃣ WedSync Starter
```
Name: WedSync Starter
Description: Perfect for solo wedding vendors
Pricing:
  - Monthly: £19.00 GBP (recurring monthly)
  - Annual: £190.00 GBP (recurring yearly)
Tax behavior: Exclusive
```

#### 2️⃣ WedSync Professional
```
Name: WedSync Professional
Description: Everything you need to scale your wedding business
Pricing:
  - Monthly: £49.00 GBP (recurring monthly)
  - Annual: £490.00 GBP (recurring yearly)
Tax behavior: Exclusive
Metadata:
  tier: PROFESSIONAL
  popular: true
```

#### 3️⃣ WedSync Scale
```
Name: WedSync Scale
Description: For established wedding businesses
Pricing:
  - Monthly: £79.00 GBP (recurring monthly)
  - Annual: £790.00 GBP (recurring yearly)
Tax behavior: Exclusive
Metadata:
  tier: SCALE
```

#### 4️⃣ WedSync Enterprise
```
Name: WedSync Enterprise
Description: For agencies and wedding venues
Pricing:
  - Monthly: £149.00 GBP (recurring monthly)
  - Annual: £1490.00 GBP (recurring yearly)
Tax behavior: Exclusive
Metadata:
  tier: ENTERPRISE
```

---

## 🔑 Step 2: Get Price IDs

After creating products, copy the Price IDs:

1. Click on each product
2. Find the **Pricing** section
3. Copy the Price ID (starts with `price_`)
4. Note whether it's monthly or annual

Example Price IDs:
```
price_1OZabc123456789  # Starter Monthly
price_1OZdef123456789  # Starter Annual
price_1OZghi123456789  # Professional Monthly
... etc
```

---

## 🔧 Step 3: Configure Environment Variables

### Create `.env.local` file
```bash
cp .env.example .env.local
```

### Add your Stripe keys and Price IDs
```env
# Stripe API Keys (found in Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_51O...
STRIPE_PUBLISHABLE_KEY=pk_test_51O...

# Webhook Secret (created in Step 4)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs from Step 2
STRIPE_STARTER_MONTHLY_PRICE_ID=price_1OZ...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_1OZ...
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_1OZ...
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_1OZ...
STRIPE_SCALE_MONTHLY_PRICE_ID=price_1OZ...
STRIPE_SCALE_ANNUAL_PRICE_ID=price_1OZ...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_1OZ...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_1OZ...
```

---

## 🪝 Step 4: Set Up Webhooks

### Create Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **+ Add Endpoint**
3. Configure:

```
Endpoint URL: https://yourdomain.com/api/stripe/webhook
Description: WedSync Subscription Webhooks
Events to send:
  ✅ checkout.session.completed
  ✅ customer.subscription.created
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted
  ✅ customer.subscription.trial_will_end
  ✅ invoice.payment_succeeded
  ✅ invoice.payment_failed
  ✅ payment_method.attached
  ✅ payment_method.detached
```

4. Click **Add Endpoint**
5. Copy the **Signing Secret** (starts with `whsec_`)
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Step 5: Test Mode Setup

### Use Test Mode First
1. Toggle to **Test Mode** in Stripe Dashboard
2. Use test API keys (start with `sk_test_` and `pk_test_`)
3. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires authentication: `4000 0025 0000 3155`

### Test Webhook Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret shown and use temporarily
```

---

## ✅ Step 6: Verify Configuration

### 1. Check Environment Variables
```bash
# Run this script to verify all required vars are set
node -e "
const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID',
  'STRIPE_SCALE_MONTHLY_PRICE_ID',
  'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID'
];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.log('❌ Missing:', missing);
} else {
  console.log('✅ All required Stripe env vars configured');
}
"
```

### 2. Test Checkout Session Creation
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "tier": "starter",
    "billingCycle": "monthly"
  }'

# Should return:
# { "url": "https://checkout.stripe.com/c/pay/cs_test_..." }
```

### 3. Test Webhook Processing
```bash
# With Stripe CLI running:
stripe trigger checkout.session.completed

# Check your server logs for webhook processing
```

---

## 📊 Step 7: Configure Customer Portal

### Enable Customer Portal
1. Go to **Stripe Dashboard** → **Settings** → **Billing** → **Customer Portal**
2. Click **Activate Portal**
3. Configure:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to switch plans
   - ✅ Show invoice history

### Add Portal Link to App
```typescript
// Create portal session
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://yourdomain.com/dashboard',
});

// Redirect user
window.location.href = portalSession.url;
```

---

## 🚀 Step 8: Go Live Checklist

### Before Going Live

- [ ] Switch to Live Mode in Stripe Dashboard
- [ ] Update API keys in production environment
- [ ] Update webhook endpoint URL to production domain
- [ ] Test with real card in production
- [ ] Enable VAT/GST if required
- [ ] Set up email receipts in Stripe
- [ ] Configure dispute/chargeback notifications
- [ ] Set up Stripe Radar for fraud prevention

### Production Environment Variables
```env
# Production (use live keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Same price IDs work in test and live mode
```

---

## 🔍 Monitoring & Analytics

### Set Up Stripe Dashboard Alerts
1. Go to **Settings** → **Team and Security** → **Notifications**
2. Enable:
   - Successful payments
   - Failed payments
   - Disputes
   - Subscription cancellations

### Track Key Metrics
- Monthly Recurring Revenue (MRR)
- Churn rate
- Failed payment rate
- Conversion rate (trial to paid)

---

## 🆘 Troubleshooting

### Common Issues

#### "No such price"
- Check price ID is copied correctly
- Ensure using correct mode (test vs live)

#### Webhook not received
- Check endpoint URL is correct
- Verify webhook secret matches
- Check server logs for errors

#### Currency mismatch
- Ensure all prices are in GBP
- Check Stripe account default currency

#### Trial not working
- Verify `subscription_data.trial_period_days` in checkout session
- Check trial_end date in database

---

## 📱 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **API Documentation**: https://stripe.com/docs/api
- **Webhook Documentation**: https://stripe.com/docs/webhooks

---

## 📝 Quick Reference

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### API Endpoints
```
POST /api/stripe/create-checkout-session
POST /api/stripe/webhook
GET  /api/subscription/status
```

### Database Fields
```sql
-- Organizations table
stripe_customer_id
stripe_subscription_id
subscription_status
pricing_tier
trial_ends_at
```

---

**Remember**: Always test in Test Mode first before going live!