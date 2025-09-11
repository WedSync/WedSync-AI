import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createInvoice,
  finalizeAndSendInvoice,
  voidInvoice,
  getUserInvoices,
  InvoiceData,
} from '@/lib/payments/invoice-generator';
import { getOrCreateCustomer } from '@/lib/stripe/customers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, dueDate, description, customerData, action } = body;

    // Handle different invoice actions
    if (action === 'finalize') {
      const { invoiceId } = body;
      if (!invoiceId) {
        return NextResponse.json(
          { error: 'Invoice ID is required for finalize action' },
          { status: 400 },
        );
      }

      const finalizedInvoice = await finalizeAndSendInvoice(invoiceId);
      return NextResponse.json({ invoice: finalizedInvoice });
    }

    if (action === 'void') {
      const { invoiceId } = body;
      if (!invoiceId) {
        return NextResponse.json(
          { error: 'Invoice ID is required for void action' },
          { status: 400 },
        );
      }

      const voidedInvoice = await voidInvoice(invoiceId);
      return NextResponse.json({ invoice: voidedInvoice });
    }

    // Create new invoice
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice items are required' },
        { status: 400 },
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.description || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Each item must have description, quantity, and unitPrice' },
          { status: 400 },
        );
      }

      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Quantity and unit price must be positive numbers' },
          { status: 400 },
        );
      }

      // Calculate amount for each item
      item.amount = item.quantity * item.unitPrice;
    }

    // Get or create customer
    let customerId;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profile?.stripe_customer_id) {
        customerId = profile.stripe_customer_id;
      } else {
        customerId = await getOrCreateCustomer({
          userId: user.id,
          email: customerData?.email || profile?.email || user.email!,
          name: customerData?.name || profile?.full_name,
        });
      }
    } catch (error) {
      console.error('Error handling customer:', error);
      return NextResponse.json(
        { error: 'Failed to process customer information' },
        { status: 500 },
      );
    }

    // Create invoice
    const invoiceData: InvoiceData = {
      userId: user.id,
      customerId,
      items,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      description,
      metadata: {
        created_by: user.id,
        created_via: 'wedsync_app',
      },
    };

    const invoice = await createInvoice(invoiceData);

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error handling invoice request:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (invoiceId) {
      // Get specific invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id) // Ensure user can only access their own invoices
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ invoice });
    } else {
      // Get all user invoices
      const invoices = await getUserInvoices(user.id);
      return NextResponse.json({ invoices });
    }
  } catch (error) {
    console.error('Error fetching invoices:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}
