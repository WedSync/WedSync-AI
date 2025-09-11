import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';

export interface InvoiceData {
  userId: string;
  customerId: string;
  items: InvoiceItem[];
  dueDate?: Date;
  description?: string;
  metadata?: Record<string, string>;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface WedSyncInvoice {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  due_date?: string;
  description?: string;
  invoice_pdf_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Generate invoice number in format: WS-YYYY-NNNNNN
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const supabase = await createClient();

  // Get the next sequence number for this year
  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    year_param: year,
  });

  if (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `WS-${year}-${timestamp}`;
  }

  const sequenceNumber = data || 1;
  return `WS-${year}-${sequenceNumber.toString().padStart(6, '0')}`;
}

/**
 * Create a Stripe invoice
 */
export async function createStripeInvoice(invoiceData: InvoiceData) {
  try {
    // First, create invoice items
    for (const item of invoiceData.items) {
      await stripe.invoiceItems.create({
        customer: invoiceData.customerId,
        amount: Math.round(item.amount * 100), // Convert to cents
        currency: 'usd',
        description: item.description,
        metadata: {
          user_id: invoiceData.userId,
          quantity: item.quantity.toString(),
          unit_price: item.unitPrice.toString(),
        },
      });
    }

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: invoiceData.customerId,
      description: invoiceData.description,
      auto_advance: false, // Don't auto-finalize
      metadata: {
        user_id: invoiceData.userId,
        ...invoiceData.metadata,
      },
      due_date: invoiceData.dueDate
        ? Math.floor(invoiceData.dueDate.getTime() / 1000)
        : undefined,
    });

    return invoice;
  } catch (error) {
    console.error('Error creating Stripe invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

/**
 * Create and store invoice in database
 */
export async function createInvoice(
  invoiceData: InvoiceData,
): Promise<WedSyncInvoice> {
  const supabase = await createClient();

  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create Stripe invoice
    const stripeInvoice = await createStripeInvoice(invoiceData);

    // Calculate total amount
    const totalAmount = invoiceData.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Store in database
    const { data, error } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: invoiceData.userId,
          stripe_invoice_id: stripeInvoice.id,
          invoice_number: invoiceNumber,
          amount: totalAmount,
          currency: 'usd',
          status: 'draft',
          due_date: invoiceData.dueDate?.toISOString(),
          description: invoiceData.description,
          metadata: {
            items: invoiceData.items,
            ...invoiceData.metadata,
          },
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

/**
 * Finalize and send invoice
 */
export async function finalizeAndSendInvoice(
  invoiceId: string,
): Promise<WedSyncInvoice> {
  const supabase = await createClient();

  try {
    // Get invoice from database
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error('Invoice not found');
    }

    // Finalize the Stripe invoice
    const stripeInvoice = await stripe.invoices.finalizeInvoice(
      invoice.stripe_invoice_id,
      {
        auto_advance: true, // Automatically send the invoice
      },
    );

    // Update database with finalized status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'open',
        invoice_pdf_url: stripeInvoice.invoice_pdf,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedInvoice;
  } catch (error) {
    console.error('Error finalizing invoice:', error);
    throw new Error('Failed to finalize invoice');
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoice(
  invoiceId: string,
): Promise<WedSyncInvoice | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

/**
 * Get user invoices
 */
export async function getUserInvoices(
  userId: string,
): Promise<WedSyncInvoice[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return [];
  }
}

/**
 * Mark invoice as paid (called from webhook)
 */
export async function markInvoiceAsPaid(
  stripeInvoiceId: string,
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_invoice_id', stripeInvoiceId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
}

/**
 * Void an invoice
 */
export async function voidInvoice(invoiceId: string): Promise<WedSyncInvoice> {
  const supabase = await createClient();

  try {
    // Get invoice from database
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error('Invoice not found');
    }

    // Void the Stripe invoice if it's not already paid
    if (invoice.status !== 'paid') {
      await stripe.invoices.voidInvoice(invoice.stripe_invoice_id);
    }

    // Update database
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'void',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedInvoice;
  } catch (error) {
    console.error('Error voiding invoice:', error);
    throw new Error('Failed to void invoice');
  }
}
