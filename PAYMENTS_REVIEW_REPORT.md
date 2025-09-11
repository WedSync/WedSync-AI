# WedSync Payments Feature - Critical Security & Implementation Review

**Review Date**: January 14, 2025  
**Reviewer**: Claude Code  
**Severity Levels**: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🔵 LOW

---

## Executive Summary

The WedSync payments implementation has **CRITICAL SECURITY VULNERABILITIES** that must be addressed before processing any real payments. While basic Stripe integration exists, there are significant gaps in security, data integrity, and feature completeness.

**Overall Status**: ❌ **NOT PRODUCTION READY**

---

## 🔴 CRITICAL SECURITY ISSUES (Fix Immediately)

### 1. **Missing Payment History Table** 
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/api/stripe/webhook/route.ts` lines 137-170  
**Issue**: Code attempts to insert into `payment_history` table that doesn't exist in database schema  
**Impact**: Webhook handler will fail, causing payment data loss  
**Fix Required**:
```sql
CREATE TABLE payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  customer_id VARCHAR(255),
  amount INTEGER NOT NULL, -- Store in cents
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_history_org ON payment_history(organization_id);
CREATE INDEX idx_payment_history_customer ON payment_history(customer_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
```

### 2. **No Idempotency Key Implementation**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/api/stripe/webhook/route.ts`  
**Issue**: Webhooks can be delivered multiple times; no protection against duplicate processing  
**Impact**: Double charges, duplicate subscriptions, data corruption  
**Fix Required**:
- Store Stripe event IDs in database
- Check for duplicates before processing
- Implement idempotent webhook handler

### 3. **Missing User Authentication in Checkout**
**Severity**: 🔴 CRITICAL  
**Location**: `/src/app/api/stripe/create-checkout-session/route.ts`  
**Issue**: No authentication check - anyone can create checkout sessions  
**Impact**: Unauthorized access to payment flow, potential abuse  
**Fix Required**:
- Add authentication middleware
- Verify user has permission to upgrade
- Link checkout to authenticated user

### 4. **Hardcoded API Credentials**
**Severity**: 🔴 CRITICAL  
**Location**: Multiple files  
**Issue**: API keys initialized with empty strings if env vars missing  
**Impact**: Runtime failures, potential security exposure  
**Fix Required**:
- Fail fast if required env vars missing
- Never use empty string defaults for secrets

---

## 🟠 HIGH PRIORITY ISSUES

### 5. **No HTTPS Enforcement**
**Severity**: 🟠 HIGH  
**Issue**: No middleware enforcing HTTPS for payment pages  
**Impact**: Credit card data could be intercepted  
**Fix**: Add middleware to redirect HTTP to HTTPS in production

### 6. **Missing Database Transactions**
**Severity**: 🟠 HIGH  
**Location**: Webhook handlers  
**Issue**: Multiple database operations not wrapped in transactions  
**Impact**: Partial updates if failures occur, data inconsistency  
**Fix**: Wrap all webhook database operations in transactions

### 7. **Incorrect User Update Logic**
**Severity**: 🟠 HIGH  
**Location**: `/src/app/api/stripe/webhook/route.ts` lines 61-80  
**Issue**: Updates `users` table but schema shows subscriptions in `organizations` table  
**Impact**: Subscription data not properly stored  
**Fix**: Update correct table (`organizations` not `users`)

### 8. **No Price Validation**
**Severity**: 🟠 HIGH  
**Location**: `/src/app/api/stripe/create-checkout-session/route.ts`  
**Issue**: Accepts any priceId from client without validation  
**Impact**: Users could potentially manipulate prices  
**Fix**: Validate priceId against allowed values server-side

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **Floating Point for Prices**
**Severity**: 🟡 MEDIUM  
**Location**: `/src/app/pricing/page.tsx`  
**Issue**: Using number type for prices instead of integers (cents)  
**Impact**: Potential rounding errors  
**Fix**: Always use integer cents for money calculations

### 10. **Missing Error Recovery**
**Severity**: 🟡 MEDIUM  
**Issue**: No retry logic for failed webhook processing  
**Impact**: Lost payment data if temporary failures occur  
**Fix**: Implement exponential backoff retry mechanism

### 11. **No Subscription Status Sync**
**Severity**: 🟡 MEDIUM  
**Issue**: No periodic sync with Stripe to verify subscription status  
**Impact**: Local data can become out of sync  
**Fix**: Add daily cron job to sync subscription statuses

### 12. **TypeScript 'any' Types**
**Severity**: 🟡 MEDIUM  
**Location**: Throughout payment code  
**Issue**: Using `any` type defeats TypeScript safety  
**Fix**: Define proper types for all Stripe objects

---

## 🔵 LOW PRIORITY ISSUES

### 13. **Incomplete Webhook Events**
**Severity**: 🔵 LOW  
**Missing Events**:
- `customer.subscription.trial_will_end`
- `payment_method.attached`
- `payment_method.detached`
- `charge.dispute.created`

### 14. **No Webhook Event Logging**
**Severity**: 🔵 LOW  
**Issue**: Minimal logging for debugging webhook issues  
**Fix**: Add comprehensive structured logging

---

## Feature Completeness Assessment

### ✅ Implemented
- Basic subscription creation
- Webhook signature verification
- Rate limiting on payment endpoints
- Basic pricing page UI
- Email notification integration

### ❌ Missing Critical Features
- Payment method management (add/update/remove cards)
- Invoice generation and display
- Refund processing
- Payment history UI
- Subscription management UI (upgrade/downgrade/cancel)
- Multi-currency support
- Tax calculation
- Vendor payout system
- Payment receipts
- Failed payment recovery flow
- Dunning management

---

## Immediate Action Plan

### Phase 1: Critical Security (Do Now)
1. Create payment_history table
2. Add idempotency protection
3. Implement authentication on checkout endpoint
4. Fix environment variable handling
5. Update webhook to use correct database tables

### Phase 2: Data Integrity (Next)
1. Implement database transactions
2. Add price validation
3. Fix money calculation types
4. Add subscription sync job

### Phase 3: Feature Completion (After Security)
1. Build subscription management UI
2. Add payment method management
3. Implement refund flow
4. Create payment history view
5. Add invoice generation

---

## Code to Add Immediately

### 1. Payment History Table Migration
```sql
-- Add to migrations
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  customer_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  refunded_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload JSONB,
  error TEXT
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
```

### 2. Fixed Webhook Handler with Idempotency
```typescript
// Add at start of webhook handler
const { data: existingEvent } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (existingEvent) {
  console.log(`Event ${event.id} already processed, skipping`);
  return NextResponse.json({ received: true });
}

// After successful processing
await supabase.from('webhook_events').insert({
  stripe_event_id: event.id,
  event_type: event.type,
  payload: event
});
```

### 3. Authentication Middleware
```typescript
// Add to checkout session endpoint
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In the handler
const authHeader = request.headers.get('authorization');
if (!authHeader) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Testing Checklist

### Critical Tests Required
- [ ] Test duplicate webhook delivery handling
- [ ] Test payment with expired card
- [ ] Test subscription cancellation
- [ ] Test webhook signature validation
- [ ] Test rate limiting on payment endpoints
- [ ] Test database rollback on failures
- [ ] Test concurrent payment attempts
- [ ] Test refund processing
- [ ] Load test with 100 simultaneous checkouts
- [ ] Test with Stripe test cards for all scenarios

---

## Security Audit Summary

**PCI Compliance**: ✅ PARTIAL (using Stripe hosted checkout)  
**HTTPS Enforcement**: ❌ MISSING  
**Authentication**: ❌ MISSING on critical endpoints  
**Authorization**: ❌ NOT IMPLEMENTED  
**Rate Limiting**: ✅ IMPLEMENTED (5 req/min for payments)  
**SQL Injection Protection**: ✅ Using parameterized queries  
**XSS Protection**: ✅ Next.js handles by default  
**CSRF Protection**: ⚠️ Needs verification  
**Audit Logging**: ❌ NOT IMPLEMENTED  

---

## Recommendations

1. **DO NOT DEPLOY TO PRODUCTION** until all CRITICAL issues are resolved
2. Implement comprehensive payment testing suite
3. Add monitoring and alerting for payment failures
4. Create runbook for payment issue resolution
5. Consider using Stripe's Payment Elements for better UX
6. Implement proper audit logging for all payment events
7. Add automated testing in CI/CD pipeline
8. Create sandbox environment for payment testing

---

## Estimated Time to Production-Ready

- **Critical Security Fixes**: 2-3 days
- **High Priority Issues**: 2-3 days  
- **Feature Completion**: 5-7 days
- **Testing & Validation**: 2-3 days

**Total**: 11-16 days of focused development

---

**IMPORTANT**: This payment system handles money. Every bug could cost real revenue or damage customer trust. Take the time to fix these issues properly before going live.