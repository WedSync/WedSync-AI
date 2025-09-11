# 03-refund-policy.md

## What to Build

Automated refund system with clear policies balancing buyer protection and creator rights.

## Key Technical Requirements

### Refund Policy Rules

```
const REFUND_POLICY = {
  automatic_window: 24, // hours
  review_window: 168, // 7 days
  valid_reasons: [
    'not_as_described',
    'technical_issues',
    'duplicate_purchase',
    'quality_issue'
  ],
  partial_refund_schedule: [
    { days: 0-1, percentage: 100 },
    { days: 2-3, percentage: 75 },
    { days: 4-7, percentage: 50 },
    { days: 8+, percentage: 0 }
  ]
};
```

### Refund Processing

```
class RefundService {
  async processRefund(purchaseId: string, reason: string) {
    const purchase = await this.getPurchase(purchaseId);
    const hoursElapsed = this.getHoursSince(purchase.created_at);
    
    if (hoursElapsed <= 24) {
      // Automatic refund
      return this.automaticRefund(purchase);
    } else if (hoursElapsed <= 168) {
      // Manual review required
      return this.createRefundRequest(purchase, reason);
    } else {
      throw new Error('Refund window expired');
    }
  }
  
  private async automaticRefund(purchase: Purchase) {
    // Process Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: purchase.payment_intent_id
    });
    
    // Revoke template access
    await this.revokeAccess(purchase);
    
    // Update records
    purchase.status = 'refunded';
    await [purchase.save](http://purchase.save)();
    
    return refund;
  }
}
```

### Refund UI Component

```
const RefundRequest = ({ purchase }) => {
  const eligibility = useRefundEligibility(purchase);
  
  if (!eligibility.canRefund) {
    return <Alert>Refund period expired (7 days)</Alert>;
  }
  
  return (
    <Form onSubmit={handleRefund}>
      <Select name="reason" required>
        <option>Not as described</option>
        <option>Technical issues</option>
        <option>Duplicate purchase</option>
      </Select>
      
      <Textarea 
        name="details" 
        required={!eligibility.isAutomatic}
      />
      
      <Button type="submit">
        {eligibility.isAutomatic ? 'Get Instant Refund' : 'Submit Request'}
      </Button>
    </Form>
  );
};
```

## Critical Implementation Notes

### Commission Handling

- Platform keeps 30% commission even on refunds
- Creator charged back their 70% portion
- Offset against future earnings

### Abuse Prevention

- Track refund rate per buyer (flag >20%)
- Block purchases after 3 refunds in 90 days
- Manual review for serial refunders

### Non-Refundable Items

- Custom work completed
- Downloaded source files
- Bundles after partial use

## Database/API Structure

```
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id),
  reason VARCHAR(50),
  status VARCHAR(20),
  refund_amount INTEGER,
  created_at TIMESTAMPTZ
);
```