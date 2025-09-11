/**
 * WS-109: Financial Data Recording API Endpoint
 *
 * POST /api/marketplace/financial/record-sale
 *
 * Records sale transactions and triggers comprehensive financial data processing
 * including revenue records, commission calculations, and earnings accumulation.
 *
 * Team B - Batch 8 - Round 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { financialDataProcessingService } from '@/lib/services/financialDataProcessingService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================================================

interface RecordSaleRequest {
  sale_id: string;
  creator_id: string;
  template_id: string;
  customer_id: string;
  gross_amount: number; // in cents
  payment_method: 'stripe' | 'paypal' | 'bank_transfer';
  currency?: string;
  sale_date?: string; // ISO date string
  promotional_code?: string;
  bundle_sale?: boolean;
}

interface RecordSaleResponse {
  success: boolean;
  revenue_record_id?: string;
  commission_breakdown?: {
    commission_rate: number;
    creator_earnings_cents: number;
    stripe_fee_cents: number;
    vat_amount_cents: number;
    net_platform_revenue_cents: number;
    creator_tier: string;
  };
  error?: string;
}

// =====================================================================================
// API HANDLERS
// =====================================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check - only system or admin can record sales
    const authCheck = await verifySystemAccess(request);
    if (!authCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error,
        },
        { status: authCheck.status || 403 },
      );
    }

    // Parse request body
    const body: RecordSaleRequest = await request.json();

    // Validate required fields
    const validation = validateSaleRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 },
      );
    }

    // Verify creator and template exist
    const verificationResult = await verifyEntities(
      body.creator_id,
      body.template_id,
      body.customer_id,
    );
    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.error,
        },
        { status: verificationResult.status },
      );
    }

    // Check for duplicate sale ID
    const duplicateCheck = await checkDuplicateSale(body.sale_id);
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sale ID already exists in the system',
        },
        { status: 409 },
      );
    }

    // Prepare sale transaction
    const transaction = {
      sale_id: body.sale_id,
      creator_id: body.creator_id,
      template_id: body.template_id,
      customer_id: body.customer_id,
      gross_amount: body.gross_amount,
      payment_method: body.payment_method,
      currency: body.currency || 'GBP',
      sale_date: body.sale_date ? new Date(body.sale_date) : new Date(),
      promotional_code: body.promotional_code,
      bundle_sale: body.bundle_sale || false,
    };

    // Process the sale transaction
    const result =
      await financialDataProcessingService.recordSaleTransaction(transaction);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to process sale transaction',
        },
        { status: 500 },
      );
    }

    // Log the successful transaction
    await logSaleProcessing(body.sale_id, body.creator_id, body.gross_amount);

    const response: RecordSaleResponse = {
      success: true,
      revenue_record_id: result.revenue_record_id,
      commission_breakdown: result.commission_breakdown
        ? {
            commission_rate: result.commission_breakdown.commission_rate,
            creator_earnings_cents:
              result.commission_breakdown.creator_earnings_cents,
            stripe_fee_cents: result.commission_breakdown.stripe_fee_cents,
            vat_amount_cents: result.commission_breakdown.vat_amount_cents,
            net_platform_revenue_cents:
              result.commission_breakdown.net_platform_revenue_cents,
            creator_tier: result.commission_breakdown.creator_tier,
          }
        : undefined,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Financial data recording API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record sale transaction. Please try again.',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

async function verifySystemAccess(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  status?: number;
  userId?: string;
}> {
  try {
    // Check for API key authentication (for system-to-system calls)
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey) {
      // Validate API key
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('id, user_id, permissions')
        .eq('key_hash', apiKey)
        .eq('active', true)
        .single();

      if (keyError || !keyData) {
        return {
          valid: false,
          error: 'Invalid API key',
          status: 401,
        };
      }

      // Check if API key has financial permissions
      const permissions = (keyData.permissions as string[]) || [];
      if (
        !permissions.includes('financial:write') &&
        !permissions.includes('admin')
      ) {
        return {
          valid: false,
          error: 'API key lacks financial write permissions',
          status: 403,
        };
      }

      return { valid: true, userId: keyData.user_id };
    }

    // Check for Bearer token authentication (for user calls)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Authorization header or API key required',
        status: 401,
      };
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        valid: false,
        error: 'Invalid or expired token',
        status: 401,
      };
    }

    // Check if user has admin role for financial operations
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        valid: false,
        error: 'User profile not found',
        status: 404,
      };
    }

    if (!['admin', 'super_admin', 'system'].includes(profile.role)) {
      return {
        valid: false,
        error: 'Admin access required for financial operations',
        status: 403,
      };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error('System access verification error:', error);
    return {
      valid: false,
      error: 'Authentication verification failed',
      status: 500,
    };
  }
}

function validateSaleRequest(body: any): { valid: boolean; error?: string } {
  if (!body.sale_id || typeof body.sale_id !== 'string') {
    return { valid: false, error: 'sale_id is required and must be a string' };
  }

  if (!body.creator_id || typeof body.creator_id !== 'string') {
    return {
      valid: false,
      error: 'creator_id is required and must be a string',
    };
  }

  if (!body.template_id || typeof body.template_id !== 'string') {
    return {
      valid: false,
      error: 'template_id is required and must be a string',
    };
  }

  if (!body.customer_id || typeof body.customer_id !== 'string') {
    return {
      valid: false,
      error: 'customer_id is required and must be a string',
    };
  }

  if (
    !body.gross_amount ||
    typeof body.gross_amount !== 'number' ||
    body.gross_amount <= 0
  ) {
    return {
      valid: false,
      error: 'gross_amount is required and must be a positive number in cents',
    };
  }

  if (
    !body.payment_method ||
    !['stripe', 'paypal', 'bank_transfer'].includes(body.payment_method)
  ) {
    return {
      valid: false,
      error: 'payment_method must be one of: stripe, paypal, bank_transfer',
    };
  }

  // Validate amount is reasonable (between 1p and £50,000)
  if (body.gross_amount < 1 || body.gross_amount > 5000000) {
    return {
      valid: false,
      error: 'gross_amount must be between 1 and 5,000,000 cents',
    };
  }

  if (body.sale_date) {
    const saleDate = new Date(body.sale_date);
    if (isNaN(saleDate.getTime())) {
      return {
        valid: false,
        error: 'sale_date must be a valid ISO date string',
      };
    }

    // Don't allow future sales more than 1 hour ahead (account for timezone issues)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (saleDate > oneHourFromNow) {
      return { valid: false, error: 'sale_date cannot be in the future' };
    }
  }

  if (body.currency && typeof body.currency !== 'string') {
    return { valid: false, error: 'currency must be a string when provided' };
  }

  return { valid: true };
}

async function verifyEntities(
  creatorId: string,
  templateId: string,
  customerId: string,
): Promise<{ valid: boolean; error?: string; status?: number }> {
  try {
    // Verify creator exists and is active
    const { data: creator, error: creatorError } = await supabase
      .from('suppliers')
      .select('id, account_status')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return {
        valid: false,
        error: 'Creator not found',
        status: 404,
      };
    }

    if (
      creator.account_status === 'suspended' ||
      creator.account_status === 'disabled'
    ) {
      return {
        valid: false,
        error: 'Creator account is not active',
        status: 403,
      };
    }

    // Verify template exists and belongs to creator
    const { data: template, error: templateError } = await supabase
      .from('marketplace_templates')
      .select('id, creator_id, status')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return {
        valid: false,
        error: 'Template not found',
        status: 404,
      };
    }

    if (template.creator_id !== creatorId) {
      return {
        valid: false,
        error: 'Template does not belong to the specified creator',
        status: 403,
      };
    }

    if (template.status !== 'active' && template.status !== 'published') {
      return {
        valid: false,
        error: 'Template is not available for sale',
        status: 403,
      };
    }

    // Verify customer exists (basic check)
    const { data: customer, error: customerError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return {
        valid: false,
        error: 'Customer not found',
        status: 404,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Entity verification error:', error);
    return {
      valid: false,
      error: 'Unable to verify entities',
      status: 500,
    };
  }
}

async function checkDuplicateSale(
  saleId: string,
): Promise<{ isDuplicate: boolean }> {
  try {
    const { data, error } = await supabase
      .from('marketplace_revenue_records')
      .select('id')
      .eq('sale_id', saleId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found - not a duplicate
      return { isDuplicate: false };
    }

    if (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false }; // Assume not duplicate if we can't check
    }

    return { isDuplicate: !!data };
  } catch (error) {
    console.error('Duplicate sale check error:', error);
    return { isDuplicate: false };
  }
}

async function logSaleProcessing(
  saleId: string,
  creatorId: string,
  grossAmount: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('marketplace_processing_logs')
      .insert({
        event_type: 'sale_processed',
        entity_type: 'sale',
        entity_id: saleId,
        metadata: {
          creator_id: creatorId,
          gross_amount_cents: grossAmount,
          processed_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log sale processing:', error);
      // Don't throw - logging failure shouldn't break the API
    }
  } catch (error) {
    console.error('Sale processing log error:', error);
    // Don't throw - logging failure shouldn't break the API
  }
}
