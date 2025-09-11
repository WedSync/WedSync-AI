/**
 * WS-115: Template Installation API Endpoint
 * Handles template installation for purchases
 *
 * Team C - Batch 9 - Round 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { MarketplacePurchaseService } from '@/lib/services/marketplace-purchase-service';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/marketplace/purchase/[id]/install
 * Install purchased template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient(cookies());

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purchaseId = params.id;

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 },
      );
    }

    // Verify user owns the purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('marketplace_purchases')
      .select('buyer_id, payment_status, installed')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 },
      );
    }

    // Get user's supplier ID
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier profile not found' },
        { status: 404 },
      );
    }

    // Check if user is the buyer
    if (purchase.buyer_id !== supplier.id) {
      return NextResponse.json(
        { error: 'Unauthorized to install this template' },
        { status: 403 },
      );
    }

    // Check payment status
    if (purchase.payment_status !== 'completed') {
      return NextResponse.json(
        { error: 'Purchase must be completed before installation' },
        { status: 400 },
      );
    }

    // Check if already installed
    if (purchase.installed) {
      return NextResponse.json(
        { error: 'Template is already installed' },
        { status: 400 },
      );
    }

    // Install template
    const installResult =
      await MarketplacePurchaseService.installTemplate(purchaseId);

    if (!installResult.success) {
      return NextResponse.json(
        {
          error: 'Installation failed',
          details: installResult.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        installedItems: installResult.installedItems,
        message: 'Template installed successfully',
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Error installing template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to install template' },
      { status: 500 },
    );
  }
}
