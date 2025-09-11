# 01-purchase-flow.md

## What to Build

Complete end-to-end purchase flow for marketplace templates, from discovery through installation with secure payment processing.

## Key Technical Requirements

### Purchase Flow States

```
enum PurchaseState {
  BROWSING = 'browsing',
  PREVIEW = 'preview',
  CHECKOUT = 'checkout',
  PAYMENT = 'payment',
  PROCESSING = 'processing',
  INSTALLING = 'installing',
  COMPLETE = 'complete',
  FAILED = 'failed'
}

interface PurchaseFlow {
  currentState: PurchaseState;
  templateId: string;
  buyerId: string;
  sessionId: string;
  startedAt: Date;
  completedAt?: Date;
  paymentIntentId?: string;
}
```

### Frontend Purchase Component

```
const PurchaseFlow = ({ template }) => {
  const [state, setState] = useState<PurchaseState>('preview');
  const [paymentIntent, setPaymentIntent] = useState(null);
  
  const handlePurchase = async () => {
    setState('checkout');
    
    // Create payment intent
    const intent = await [api.post](http://api.post)('/marketplace/purchase/intent', {
      template_id: [template.id](http://template.id)
    });
    
    setPaymentIntent(intent);
    setState('payment');
  };
  
  return (
    <Modal isOpen={true} size="lg">
      {state === 'preview' && (
        <TemplatePreview 
          template={template}
          onPurchase={handlePurchase}
        />
      )}
      
      {state === 'payment' && (
        <Elements stripe={stripePromise}>
          <PaymentForm 
            intent={paymentIntent}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      )}
      
      {state === 'installing' && (
        <InstallProgress 
          template={template}
          onComplete={() => setState('complete')}
        />
      )}
    </Modal>
  );
};
```

### Payment Processing

```
class PurchaseService {
  async createPurchaseIntent(templateId: string, buyerId: string) {
    // Validate buyer can purchase
    const buyer = await this.validateBuyer(buyerId);
    const template = await this.getTemplate(templateId);
    
    if (!this.canPurchase(buyer, template)) {
      throw new Error('Purchase not allowed');
    }
    
    // Calculate fees
    const fees = this.calculateFees(template.price, template.creator.tier);
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: template.price,
      currency: 'gbp',
      application_fee_amount: fees.platform_commission,
      transfer_data: {
        destination: template.creator.stripe_account_id
      },
      metadata: {
        template_id: templateId,
        buyer_id: buyerId,
        template_name: template.title
      }
    });
    
    // Record purchase intent
    await db.purchases.create({
      template_id: templateId,
      buyer_id: buyerId,
      status: 'pending',
      payment_intent_id: [paymentIntent.id](http://paymentIntent.id),
      amount: template.price,
      commission: fees.platform_commission
    });
    
    return paymentIntent.client_secret;
  }
  
  async completePurchase(paymentIntentId: string) {
    const purchase = await db.purchases.findOne({ 
      payment_intent_id: paymentIntentId 
    });
    
    // Update purchase status
    purchase.status = 'completed';
    purchase.completed_at = new Date();
    await [purchase.save](http://purchase.save)();
    
    // Trigger installation
    await this.installTemplate(purchase);
    
    // Update analytics
    await this.updateAnalytics(purchase);
    
    // Notify creator
    await this.notifyCreator(purchase);
    
    return purchase;
  }
}
```

### Template Installation

```
class TemplateInstaller {
  async install(purchase: Purchase) {
    const template = await this.getTemplatePackage(purchase.template_id);
    const buyer = await this.getBuyer(purchase.buyer_id);
    
    // Begin transaction
    const trx = await db.transaction();
    
    try {
      // Install forms
      if (template.forms) {
        for (const form of template.forms) {
          await this.installForm(form, [buyer.id](http://buyer.id), trx);
        }
      }
      
      // Install journeys
      if (template.journeys) {
        for (const journey of template.journeys) {
          await this.installJourney(journey, [buyer.id](http://buyer.id), trx);
        }
      }
      
      // Install email templates
      if (template.emails) {
        for (const email of template.emails) {
          await this.installEmail(email, [buyer.id](http://buyer.id), trx);
        }
      }
      
      await trx.commit();
      
      // Mark as installed
      purchase.installed = true;
      purchase.installed_at = new Date();
      await [purchase.save](http://purchase.save)();
      
    } catch (error) {
      await trx.rollback();
      throw new InstallationError(error);
    }
  }
  
  private generateNewIds(item: any): any {
    // Recursively replace all IDs to prevent conflicts
    const newItem = { ...item, id: uuid() };
    
    if (newItem.fields) {
      newItem.fields = [newItem.fields.map](http://newItem.fields.map)(f => ({ 
        ...f, 
        id: uuid() 
      }));
    }
    
    return newItem;
  }
}
```

## Critical Implementation Notes

### Security Checks

- Verify tier access before purchase
- Check monthly purchase limits (Starter tier)
- Validate payment method ownership
- Prevent duplicate purchases of same template
- Rate limit purchase attempts (max 3/minute)

### Error Handling

```
const ERROR_RECOVERY = {
  payment_failed: 'Retry payment with different method',
  installation_failed: 'Manual installation by support',
  tier_insufficient: 'Prompt upgrade with discount',
  limit_reached: 'Show when limit resets'
};
```

### Purchase Analytics

- Track funnel conversion at each step
- Monitor payment failure reasons
- Calculate average purchase time
- Track installation success rate

## Database/API Structure

### Purchase Records

```
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES templates(id),
  buyer_id UUID REFERENCES suppliers(id),
  payment_intent_id VARCHAR(255),
  amount INTEGER,
  commission INTEGER,
  status VARCHAR(20),
  installed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  installed_at TIMESTAMPTZ
);
```

### Webhook Handler

```
// Stripe webhook for payment confirmation
[app.post](http://app.post)('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body, 
    sig, 
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    await purchaseService.completePurchase(
      [event.data.object.id](http://event.data.object.id)
    );
  }
  
  res.json({ received: true });
});
```