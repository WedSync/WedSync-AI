# 03-invoice-generation.md

# [03-invoice-generation.md](http://03-invoice-generation.md)

## What to Build

Implement automated invoice generation, customization, and delivery. Handle tax calculations, discounts, and marketplace split payments.

## Key Technical Requirements

### Invoice Configuration

```
// lib/stripe/invoice-config.ts
export const INVOICE_SETTINGS = {
  company: {
    name: 'WedSync Ltd',
    address: {
      line1: '123 Wedding Lane',
      city: 'London',
      postal_code: 'SW1A 1AA',
      country: 'GB',
    },
    vat_number: 'GB123456789',
    email: '[billing@wedsync.app](mailto:billing@wedsync.app)',
  },
  payment_terms: 'due_on_receipt',
  footer: 'Thank you for choosing WedSync!',
  tax_id_collection: true,
};
```

### Invoice Creation Hook

```
// app/api/webhooks/stripe/invoice-created.ts
export async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Add company details to invoice
  await stripe.invoices.update([invoice.id](http://invoice.id), {
    custom_fields: [
      { name: 'Supplier ID', value: invoice.metadata.supplier_id },
      { name: 'Plan', value: invoice.metadata.plan_name },
    ],
    footer: INVOICE_SETTINGS.footer,
  });
  
  // Store invoice reference
  await supabase.from('invoices').insert({
    supplier_id: invoice.metadata.supplier_id,
    stripe_invoice_id: [invoice.id](http://invoice.id),
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    created_at: new Date(invoice.created * 1000),
  });
}
```

### Tax Calculation

```
// lib/stripe/tax.ts
export async function calculateTax(customerId: string, amount: number) {
  const customer = await stripe.customers.retrieve(customerId);
  
  // UK VAT logic
  const vatRates = {
    'GB': 0.20,  // Standard UK VAT
    'EU': 0.20,  // Simplified EU rate (implement MOSS later)
    'US': 0,     // No VAT for US
    'DEFAULT': 0,
  };
  
  const country = customer.address?.country || 'DEFAULT';
  const region = country === 'GB' ? 'GB' : 
                 EU_COUNTRIES.includes(country) ? 'EU' : 
                 country;
  
  const vatRate = vatRates[region] || vatRates.DEFAULT;
  const tax = Math.round(amount * vatRate);
  
  return {
    rate: vatRate,
    amount: tax,
    inclusive: false,
    tax_code: `VAT_${region}`,
  };
}
```

### Marketplace Invoice Splitting

```
// app/api/marketplace/invoice-split.ts
export async function createMarketplaceSplit(saleAmount: number, creatorId: string) {
  const platformFee = Math.round(saleAmount * 0.30); // 30% platform fee
  const creatorPayout = saleAmount - platformFee;
  
  // Create transfer to creator's Connect account
  const transfer = await stripe.transfers.create({
    amount: creatorPayout,
    currency: 'gbp',
    destination: creatorId, // Creator's Connect account
    metadata: {
      type: 'marketplace_sale',
      platform_fee: platformFee,
    },
  });
  
  // Generate platform invoice
  const platformInvoiceItem = await stripe.invoiceItems.create({
    customer: 'platform_account',
    amount: platformFee,
    currency: 'gbp',
    description: 'Marketplace platform fee (30%)',
  });
  
  return { transfer, platformInvoiceItem };
}
```

### Custom Invoice Generation

```
// app/api/invoices/generate/route.ts
export async function POST(request: Request) {
  const { supplierId, items, dueDate } = await request.json();
  
  const customer = await getStripeCustomer(supplierId);
  
  // Create invoice items
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customer.stripe_customer_id,
      amount: item.amount,
      currency: 'gbp',
      description: item.description,
    });
  }
  
  // Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.stripe_customer_id,
    collection_method: 'send_invoice',
    due_date: Math.floor(new Date(dueDate).getTime() / 1000),
    auto_advance: false, // Don't auto-finalize
  });
  
  // Add line items and finalize
  await stripe.invoices.finalizeInvoice([invoice.id](http://invoice.id));
  
  // Send to customer
  await stripe.invoices.sendInvoice([invoice.id](http://invoice.id));
  
  return NextResponse.json({ invoiceUrl: invoice.hosted_invoice_url });
}
```

## Database Schema

```
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  stripe_invoice_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  tax_amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL
);
```

## Critical Implementation Notes

### Invoice Numbering

- Use Stripe's auto-incrementing invoice numbers
- Prefix with 'WS-' for branding
- Include year and month: WS-2024-03-0001
- Never reuse or skip numbers

### PDF Customization

- Use Stripe's hosted invoice for legal compliance
- Generate custom PDF for branding if needed
- Store PDF URLs, don't generate on-the-fly
- Include QR code for quick payment

### Payment Reminders

- Automatic reminders at -7, -3, 0, +3, +7 days
- Escalating tone in reminder emails
- Include one-click payment link
- CC accounts department on overdue invoices

### Refunds & Credits

- Create credit notes for refunds
- Apply credits to next invoice automatically
- Track refund reasons for analytics
- Notify customer success team of refunds