# 04-failed-payment-handling.md

# [04-failed-payment-handling.md](http://04-failed-payment-handling.md)

## What to Build

Implement comprehensive failed payment recovery system with automatic retries, customer communication, and account suspension logic.

## Key Technical Requirements

### Webhook Handler

```
// app/api/webhooks/stripe/payment-failed.ts
export async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = [event.data](http://event.data).object as Stripe.Invoice;
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  // Update database
  await supabase
    .from('payment_failures')
    .insert({
      supplier_id: subscription.metadata.supplier_id,
      stripe_invoice_id: [invoice.id](http://invoice.id),
      stripe_subscription_id: [subscription.id](http://subscription.id),
      amount: invoice.amount_due,
      attempt_count: invoice.attempt_count,
      next_attempt: [invoice.next](http://invoice.next)_payment_attempt 
        ? new Date([invoice.next](http://invoice.next)_payment_attempt * 1000) 
        : null,
      error_code: invoice.last_payment_error?.code,
      error_message: invoice.last_payment_error?.message,
    });
  
  // Send notification
  await sendFailedPaymentEmail(subscription.metadata.supplier_id, {
    amount: invoice.amount_due / 100,
    attemptCount: invoice.attempt_count,
    nextAttempt: [invoice.next](http://invoice.next)_payment_attempt,
  });
  
  // Check if we should suspend account
  if (invoice.attempt_count >= 3) {
    await handleAccountSuspension(subscription.metadata.supplier_id);
  }
}
```

### Retry Configuration

```
// lib/stripe/retry-config.ts
export const RETRY_SCHEDULE = {
  // Stripe retry settings
  stripe: {
    interval: 'daily',
    max_attempts: 4,
    days: [3, 5, 7, 10], // Days after initial failure
  },
  
  // Our additional retry logic
  custom: {
    grace_period_days: 7,
    final_warning_day: 5,
    suspension_day: 10,
    deletion_day: 30,
  },
};

// Configure in Stripe Dashboard or via API
await stripe.subscriptions.update(subscriptionId, {
  collection_method: 'charge_automatically',
  days_until_due: null,
  payment_settings: {
    payment_method_types: ['card'],
    save_default_payment_method: 'on_subscription',
  },
});
```

### Account Suspension Logic

```
// lib/subscriptions/suspension.ts
export async function handleAccountSuspension(supplierId: string) {
  // Set account to read-only mode
  await supabase
    .from('suppliers')
    .update({ 
      account_status: 'suspended',
      suspended_at: new Date(),
      suspension_reason: 'payment_failure',
    })
    .eq('id', supplierId);
  
  // Disable write operations
  await supabase.rpc('disable_supplier_write_access', { 
    supplier_id: supplierId 
  });
  
  // Notify the supplier
  await sendAccountSuspendedEmail(supplierId);
  
  // Notify their clients (optional)
  await notifyClientsOfSuspension(supplierId);
}
```

### Recovery Flow

```
// app/api/payments/update-card/route.ts
export async function POST(request: Request) {
  const { paymentMethodId, supplierId } = await request.json();
  
  const customer = await getStripeCustomer(supplierId);
  
  // Attach new payment method
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customer.stripe_customer_id,
  });
  
  // Set as default
  await stripe.customers.update(customer.stripe_customer_id, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  
  // Retry failed invoices
  const invoices = await stripe.invoices.list({
    customer: customer.stripe_customer_id,
    status: 'open',
  });
  
  for (const invoice of [invoices.data](http://invoices.data)) {
    try {
      await [stripe.invoices.pay](http://stripe.invoices.pay)([invoice.id](http://invoice.id));
      await handleSuccessfulRecovery(supplierId);
    } catch (error) {
      console.error(`Failed to pay invoice ${[invoice.id](http://invoice.id)}:`, error);
    }
  }
}
```

### Email Templates

```
// lib/emails/payment-failure.ts
export const paymentFailureTemplates = {
  first_failure: {
    subject: 'Payment failed - Action required',
    preview: 'Your WedSync payment couldn\'t be processed',
    tone: 'helpful',
    cta: 'Update Payment Method',
  },
  
  second_failure: {
    subject: 'Second payment attempt failed - Account at risk',
    preview: 'Your WedSync account will be suspended soon',
    tone: 'urgent',
    cta: 'Fix Payment Now',
  },
  
  final_warning: {
    subject: 'Final warning - Account suspension tomorrow',
    preview: 'This is your last chance to save your WedSync account',
    tone: 'critical',
    cta: 'Save My Account',
    includes_data_export_link: true,
  },
  
  suspended: {
    subject: 'Account suspended - Read-only access',
    preview: 'Your WedSync account has been suspended',
    tone: 'informative',
    cta: 'Reactivate Account',
    includes_grace_period_info: true,
  },
};
```

## Database Schema

```
CREATE TABLE payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  amount INTEGER,
  attempt_count INTEGER DEFAULT 1,
  next_attempt TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_failures_supplier 
  ON payment_failures(supplier_id, created_at DESC);
```

## Critical Implementation Notes

### Grace Period Rules

- Day 1-3: Soft reminders, full access maintained
- Day 4-6: Urgent warnings, show banner in app
- Day 7: Suspend write access, maintain read access
- Day 8-29: Read-only access with reactivation option
- Day 30: Data export and account deletion

### Smart Retry Timing

- Avoid retrying at night (higher failure rate)
- Retry on different days of week
- Try at time of day when previous payments succeeded
- Skip weekends for B2B customers

### Recovery Incentives

- Offer 50% off next month if updated within 24 hours
- Waive late fees for immediate update
- Extend trial if first payment failure
- Priority support for recovered accounts

### Data Preservation

- Never delete data immediately
- Create automatic backup before suspension
- Allow data export even after suspension
- Keep data for 90 days after account closure