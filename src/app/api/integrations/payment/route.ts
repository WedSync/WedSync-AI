// Payment Gateway Integration API Endpoints
// Handles Stripe, PayPal, Square, and other payment platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PaymentGatewayOrchestra } from '@/lib/integrations/marketplace/payment-gateway-orchestra';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const paymentOrchestra = new PaymentGatewayOrchestra();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'gateways':
        // Get all payment gateways for vendor
        const gateways = await paymentOrchestra.getAllGateways(vendorId);
        return NextResponse.json({ success: true, data: gateways });

      case 'balance':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get account balance from specific platform
        const balance = await paymentOrchestra.getAccountBalance(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: balance });

      case 'transactions':
        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        // Get payment transactions
        const transactions = await paymentOrchestra.getTransactionHistory(
          vendorId,
          platform,
          { limit: parseInt(limit), offset: parseInt(offset) },
        );
        return NextResponse.json({ success: true, data: transactions });

      case 'fees':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get fee structure for platform
        const fees = await paymentOrchestra.getFeeStructure(vendorId, platform);
        return NextResponse.json({ success: true, data: fees });

      case 'supported-platforms':
        // Get available payment platforms
        const platforms = await paymentOrchestra.getSupportedPlatforms();
        return NextResponse.json({ success: true, data: platforms });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, paymentData, amount, currency } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'connect':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Connect to payment platform
        const connection = await paymentOrchestra.connectPaymentGateway(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });

      case 'create-payment-link':
        if (!amount || !currency) {
          return NextResponse.json(
            { error: 'Amount and currency required' },
            { status: 400 },
          );
        }

        // Create payment link for invoice
        const paymentLink = await paymentOrchestra.createPaymentLink(
          vendorId,
          platform || 'stripe', // Default to Stripe
          { amount, currency, ...paymentData },
        );
        return NextResponse.json({
          success: true,
          data: paymentLink,
          message: 'Payment link created successfully',
        });

      case 'process-payment':
        if (!amount || !currency) {
          return NextResponse.json(
            { error: 'Amount and currency required' },
            { status: 400 },
          );
        }

        // Process direct payment
        const payment = await paymentOrchestra.processPayment(
          vendorId,
          platform || 'stripe',
          { amount, currency, ...paymentData },
        );
        return NextResponse.json({
          success: true,
          data: payment,
          message: 'Payment processed successfully',
        });

      case 'create-invoice':
        // Create invoice with payment options
        const invoice = await paymentOrchestra.createInvoice(
          vendorId,
          paymentData,
        );
        return NextResponse.json({
          success: true,
          data: invoice,
          message: 'Invoice created successfully',
        });

      case 'sync-transactions':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync recent transactions
        const syncResult = await paymentOrchestra.syncTransactions(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: `Synced ${syncResult.transactionsSynced} transactions from ${platform}`,
        });

      case 'setup-autopay':
        // Setup automatic payment collection
        const autopayResult = await paymentOrchestra.setupAutomaticPayments(
          vendorId,
          platform || 'stripe',
          paymentData,
        );
        return NextResponse.json({
          success: true,
          data: autopayResult,
          message: 'Automatic payments configured successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, gatewayId, settings, transactionId } =
      body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'update-settings':
        if (!gatewayId) {
          return NextResponse.json(
            { error: 'Gateway ID required' },
            { status: 400 },
          );
        }

        // Update payment gateway settings
        const updateResult = await paymentOrchestra.updateGatewaySettings(
          gatewayId,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'Payment gateway settings updated successfully',
        });

      case 'update-fee-structure':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Update custom fee structure
        const feeUpdate = await paymentOrchestra.updateFeeStructure(
          vendorId,
          platform,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: feeUpdate,
          message: 'Fee structure updated successfully',
        });

      case 'refund-payment':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 },
          );
        }

        // Process refund
        const refund = await paymentOrchestra.processRefund(
          vendorId,
          transactionId,
          settings?.amount || null,
        );
        return NextResponse.json({
          success: true,
          data: refund,
          message: 'Refund processed successfully',
        });

      case 'toggle-autopay':
        if (!gatewayId) {
          return NextResponse.json(
            { error: 'Gateway ID required' },
            { status: 400 },
          );
        }

        // Toggle automatic payments
        const toggleResult =
          await paymentOrchestra.toggleAutomaticPayments(gatewayId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Automatic payments ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gatewayId = searchParams.get('gatewayId');
    const vendorId = searchParams.get('vendorId');
    const action = searchParams.get('action');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'disconnect':
        if (!gatewayId) {
          return NextResponse.json(
            { error: 'Gateway ID required' },
            { status: 400 },
          );
        }

        // Disconnect payment gateway
        const result = await paymentOrchestra.disconnectPaymentGateway(
          gatewayId,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: result,
          message: 'Payment gateway disconnected successfully',
        });

      case 'cancel-invoice':
        const invoiceId = searchParams.get('invoiceId');
        if (!invoiceId) {
          return NextResponse.json(
            { error: 'Invoice ID required' },
            { status: 400 },
          );
        }

        // Cancel pending invoice
        const cancelResult = await paymentOrchestra.cancelInvoice(
          vendorId,
          invoiceId,
        );
        return NextResponse.json({
          success: true,
          data: cancelResult,
          message: 'Invoice cancelled successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}
