/**
 * WS-115: Marketplace Purchase Completion API
 *
 * POST /api/marketplace/purchase/complete
 *
 * Handles successful template purchase completion from Stripe webhooks
 * Processes payment, installs templates, generates receipts, and records analytics
 *
 * Team C - Batch 9 - Round 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email/service';
import { generateSecureToken } from '@/lib/crypto-utils';
import { auditPayment } from '@/lib/security-audit-logger';
import { financialDataProcessingService } from '@/lib/services/financialDataProcessingService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// =====================================================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================================================

interface PurchaseCompleteRequest {
  purchase_id: string;
  stripe_payment_intent_id: string;
  stripe_session_id?: string;
  payment_status: 'succeeded' | 'failed';
  amount_paid?: number;
  currency?: string;
}

interface PurchaseCompleteResponse {
  success: boolean;
  purchase_id: string;
  installation_status?: 'completed' | 'pending' | 'failed';
  receipt_id?: string;
  template_access_url?: string;
  error?: string;
}

// =====================================================================================
// API HANDLERS
// =====================================================================================

export async function POST(request: NextRequest) {
  const requestId = generateSecureToken(16);

  try {
    // Parse request
    const body: PurchaseCompleteRequest = await request.json();

    // Validate request
    const validation = validateCompleteRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 },
      );
    }

    // Authenticate request (could be from webhook or internal system)
    const authResult = await verifySystemAccess(request);
    if (!authResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.status || 401 },
      );
    }

    // Fetch purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('marketplace_purchases')
      .select(
        `
        *,
        marketplace_templates!inner (
          id,
          title,
          description,
          template_type,
          template_data,
          installation_config,
          creator_id,
          suppliers!inner (
            id,
            business_name,
            email
          )
        ),
        clients!inner (
          id,
          name,
          email,
          user_id,
          organization_id
        )
      `,
      )
      .eq('id', body.purchase_id)
      .single();

    if (purchaseError || !purchase) {
      console.error('Purchase not found:', body.purchase_id, purchaseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Purchase not found',
        },
        { status: 404 },
      );
    }

    // Check if already processed
    if (purchase.status === 'completed' || purchase.status === 'installed') {
      return NextResponse.json({
        success: true,
        purchase_id: body.purchase_id,
        installation_status: 'completed',
        message: 'Purchase already processed',
      });
    }

    // Handle payment success/failure
    if (body.payment_status === 'succeeded') {
      // Process successful purchase
      const result = await processSuccessfulPurchase(purchase, body, requestId);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            purchase_id: body.purchase_id,
            error: result.error,
          },
          { status: 500 },
        );
      }

      const response: PurchaseCompleteResponse = {
        success: true,
        purchase_id: body.purchase_id,
        installation_status: result.installation_status,
        receipt_id: result.receipt_id,
        template_access_url: result.template_access_url,
      };

      return NextResponse.json(response);
    } else {
      // Handle payment failure
      await handlePaymentFailure(purchase, body, requestId);

      return NextResponse.json({
        success: true,
        purchase_id: body.purchase_id,
        message: 'Payment failure processed',
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Purchase completion error:', errorMessage, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process purchase completion',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

async function processSuccessfulPurchase(
  purchase: any,
  body: PurchaseCompleteRequest,
  requestId: string,
) {
  try {
    // Update purchase status
    const { error: updateError } = await supabase
      .from('marketplace_purchases')
      .update({
        status: 'payment_completed',
        payment_status: 'succeeded',
        stripe_payment_intent_id: body.stripe_payment_intent_id,
        amount_paid_cents: body.amount_paid || purchase.final_price_cents,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.purchase_id);

    if (updateError) {
      console.error('Failed to update purchase status:', updateError);
      throw new Error('Failed to update purchase record');
    }

    // Record financial transaction
    await recordFinancialTransaction(purchase, body);

    // Install template for customer
    const installationResult = await installTemplateForCustomer(purchase);

    // Generate and send receipt
    const receiptId = await generatePurchaseReceipt(purchase, body);

    // Send purchase confirmation email
    await sendPurchaseConfirmationEmail(purchase, receiptId);

    // Update install count for template
    await updateTemplateInstallCount(purchase.template_id);

    // Log successful completion
    await auditPayment.purchaseCompleted(
      purchase.clients.user_id,
      purchase.clients.organization_id,
      {
        purchase_id: body.purchase_id,
        template_id: purchase.template_id,
        amount_paid: body.amount_paid || purchase.final_price_cents,
        currency: body.currency || purchase.currency,
        installation_status: installationResult.status,
        receipt_id: receiptId,
        request_id: requestId,
      },
      null, // No request object available in this context
    );

    return {
      success: true,
      installation_status: installationResult.status,
      receipt_id: receiptId,
      template_access_url: installationResult.access_url,
    };
  } catch (error) {
    console.error('Failed to process successful purchase:', error);

    // Mark purchase as failed
    await supabase
      .from('marketplace_purchases')
      .update({
        status: 'processing_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.purchase_id);

    return {
      success: false,
      error: 'Failed to complete purchase processing',
    };
  }
}

async function installTemplateForCustomer(purchase: any) {
  try {
    const template = purchase.marketplace_templates;
    const customer = purchase.clients;

    // Create installed template record
    const installedTemplateId = generateSecureToken(16);

    const { data: installedTemplate, error: installError } = await supabase
      .from('installed_templates')
      .insert({
        id: installedTemplateId,
        customer_id: customer.id,
        organization_id: customer.organization_id,
        template_id: template.id,
        template_type: template.template_type,
        template_data: template.template_data,
        installation_config: template.installation_config,
        purchase_id: purchase.id,
        status: 'active',
        installed_at: new Date().toISOString(),
        access_level: 'full',
      })
      .select()
      .single();

    if (installError || !installedTemplate) {
      console.error('Template installation failed:', installError);
      throw new Error('Failed to install template');
    }

    // Apply template to customer's dashboard/system based on type
    await applyTemplateToCustomerSystem(customer, template, installedTemplate);

    // Update purchase status
    await supabase
      .from('marketplace_purchases')
      .update({
        status: 'installed',
        installed_at: new Date().toISOString(),
      })
      .eq('id', purchase.id);

    const accessUrl = `/dashboard/templates/${installedTemplateId}`;

    return {
      status: 'completed' as const,
      access_url: accessUrl,
      installed_template_id: installedTemplateId,
    };
  } catch (error) {
    console.error('Template installation error:', error);

    return {
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Installation failed',
    };
  }
}

async function applyTemplateToCustomerSystem(
  customer: any,
  template: any,
  installedTemplate: any,
) {
  // Apply template based on its type
  switch (template.template_type) {
    case 'dashboard_template':
      await applyDashboardTemplate(customer, template, installedTemplate);
      break;
    case 'form_template':
      await applyFormTemplate(customer, template, installedTemplate);
      break;
    case 'journey_template':
      await applyJourneyTemplate(customer, template, installedTemplate);
      break;
    case 'email_template':
      await applyEmailTemplate(customer, template, installedTemplate);
      break;
    default:
      console.log(
        `Template type ${template.template_type} requires manual setup`,
      );
  }
}

async function applyDashboardTemplate(
  customer: any,
  template: any,
  installedTemplate: any,
) {
  // Create dashboard configuration from template
  const { error } = await supabase.from('dashboard_configurations').insert({
    organization_id: customer.organization_id,
    template_id: installedTemplate.id,
    configuration: template.template_data,
    active: true,
    applied_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Dashboard template application failed:', error);
    throw new Error('Failed to apply dashboard template');
  }
}

async function applyFormTemplate(
  customer: any,
  template: any,
  installedTemplate: any,
) {
  // Create form from template
  const { error } = await supabase.from('forms').insert({
    organization_id: customer.organization_id,
    title: `${template.title} (Template)`,
    description: template.description,
    form_data: template.template_data,
    template_source: installedTemplate.id,
    status: 'draft',
    created_by: customer.user_id,
  });

  if (error) {
    console.error('Form template application failed:', error);
    throw new Error('Failed to apply form template');
  }
}

async function applyJourneyTemplate(
  customer: any,
  template: any,
  installedTemplate: any,
) {
  // Create journey from template
  const { error } = await supabase.from('journeys').insert({
    organization_id: customer.organization_id,
    title: `${template.title} (Template)`,
    description: template.description,
    journey_data: template.template_data,
    template_source: installedTemplate.id,
    status: 'draft',
    created_by: customer.user_id,
  });

  if (error) {
    console.error('Journey template application failed:', error);
    throw new Error('Failed to apply journey template');
  }
}

async function applyEmailTemplate(
  customer: any,
  template: any,
  installedTemplate: any,
) {
  // Create email template
  const { error } = await supabase.from('email_templates').insert({
    organization_id: customer.organization_id,
    name: template.title,
    subject: template.template_data.subject || template.title,
    html_content: template.template_data.html_content,
    text_content: template.template_data.text_content,
    template_source: installedTemplate.id,
    created_by: customer.user_id,
  });

  if (error) {
    console.error('Email template application failed:', error);
    throw new Error('Failed to apply email template');
  }
}

async function recordFinancialTransaction(
  purchase: any,
  body: PurchaseCompleteRequest,
) {
  try {
    // Record sale in financial system
    const transaction = {
      sale_id: body.stripe_payment_intent_id,
      creator_id: purchase.creator_id,
      template_id: purchase.template_id,
      customer_id: purchase.customer_id,
      gross_amount: body.amount_paid || purchase.final_price_cents,
      payment_method: 'stripe',
      currency: body.currency || purchase.currency,
      sale_date: new Date(),
      promotional_code: purchase.promotional_code,
      bundle_sale: false,
    };

    await financialDataProcessingService.recordSaleTransaction(transaction);
  } catch (error) {
    console.error('Financial transaction recording failed:', error);
    // Don't throw - financial recording failure shouldn't break the purchase
  }
}

async function generatePurchaseReceipt(
  purchase: any,
  body: PurchaseCompleteRequest,
): Promise<string> {
  const receiptId = generateSecureToken(16);

  try {
    const { error } = await supabase.from('purchase_receipts').insert({
      id: receiptId,
      purchase_id: purchase.id,
      customer_id: purchase.customer_id,
      template_id: purchase.template_id,
      creator_id: purchase.creator_id,
      receipt_number: `WS-${Date.now()}-${receiptId.substring(0, 8)}`,
      amount_paid_cents: body.amount_paid || purchase.final_price_cents,
      currency: body.currency || purchase.currency,
      payment_method: 'stripe',
      stripe_payment_intent_id: body.stripe_payment_intent_id,
      receipt_data: {
        template_title: purchase.marketplace_templates.title,
        creator_name: purchase.marketplace_templates.suppliers.business_name,
        customer_name: purchase.clients.name,
        customer_email: purchase.clients.email,
        purchase_date: new Date().toISOString(),
        discount_applied: purchase.discount_amount_cents > 0,
        discount_amount_cents: purchase.discount_amount_cents,
        promotional_code: purchase.promotional_code,
      },
      generated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Receipt generation failed:', error);
      throw new Error('Failed to generate receipt');
    }

    return receiptId;
  } catch (error) {
    console.error('Receipt generation error:', error);
    return receiptId; // Return ID even if database insert failed
  }
}

async function sendPurchaseConfirmationEmail(purchase: any, receiptId: string) {
  try {
    const template = purchase.marketplace_templates;
    const customer = purchase.clients;
    const creator = template.suppliers;

    // Send email to customer
    await EmailService.sendPurchaseConfirmation({
      recipientEmail: customer.email,
      recipientName: customer.name,
      templateTitle: template.title,
      templateDescription: template.description,
      creatorName: creator.business_name,
      purchaseAmount: (purchase.final_price_cents / 100).toFixed(2),
      currency: purchase.currency.toUpperCase(),
      receiptId: receiptId,
      accessUrl: `/dashboard/templates/${purchase.template_id}`,
      purchaseId: purchase.id,
    });

    console.log(`Purchase confirmation sent to ${customer.email}`);
  } catch (error) {
    console.error('Failed to send purchase confirmation email:', error);
    // Don't throw - email failure shouldn't break the purchase
  }
}

async function updateTemplateInstallCount(templateId: string) {
  try {
    await supabase.rpc('increment_template_install_count', {
      template_id_param: templateId,
    });
  } catch (error) {
    console.error('Failed to update template install count:', error);
    // Don't throw - this is analytics only
  }
}

async function handlePaymentFailure(
  purchase: any,
  body: PurchaseCompleteRequest,
  requestId: string,
) {
  try {
    // Update purchase status
    await supabase
      .from('marketplace_purchases')
      .update({
        status: 'payment_failed',
        payment_status: 'failed',
        stripe_payment_intent_id: body.stripe_payment_intent_id,
        error_message: 'Payment failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.purchase_id);

    // Send payment failure email
    await EmailService.sendPaymentFailedNotification({
      customerEmail: purchase.clients.email,
      templateTitle: purchase.marketplace_templates.title,
      purchaseId: body.purchase_id,
      failureReason: 'Payment processing failed',
    });

    // Log payment failure
    await auditPayment.purchaseFailed(
      purchase.clients.user_id,
      purchase.clients.organization_id,
      {
        purchase_id: body.purchase_id,
        template_id: purchase.template_id,
        failure_reason: 'payment_failed',
        request_id: requestId,
      },
      null,
    );
  } catch (error) {
    console.error('Payment failure handling error:', error);
  }
}

function validateCompleteRequest(body: any): {
  valid: boolean;
  error?: string;
} {
  const errors: string[] = [];

  if (!body.purchase_id || typeof body.purchase_id !== 'string') {
    errors.push('purchase_id is required and must be a string');
  }

  if (!body.stripe_payment_intent_id || typeof body.stripe_payment_intent_id !== 'string') {
    errors.push('stripe_payment_intent_id is required and must be a string');
  }

  if (!body.payment_status || !['succeeded', 'failed'].includes(body.payment_status)) {
    errors.push('payment_status must be either "succeeded" or "failed"');
  }

  if (body.amount_paid && (typeof body.amount_paid !== 'number' || body.amount_paid <= 0)) {
    errors.push('amount_paid must be a positive number when provided');
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors[0] : undefined
  };
}

async function verifySystemAccess(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  status?: number;
}> {
  // Import security utilities at runtime
  const { verifyStripeWebhookSignature } = await import('@/lib/security/webhook-validation');

  // 1. STRIPE WEBHOOK VERIFICATION (Highest Priority)
  const stripeSignature = request.headers.get('stripe-signature');
  if (stripeSignature) {
    try {
      const body = await request.clone().text();
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!stripeWebhookSecret) {
        return {
          valid: false,
          error: 'Stripe webhook secret not configured',
          status: 500,
        };
      }

      const isValidStripeWebhook = verifyStripeWebhookSignature(
        body,
        stripeSignature,
        stripeWebhookSecret,
        300 // 5 minutes tolerance
      );

      if (isValidStripeWebhook) {
        return { valid: true };
      } else {
        return {
          valid: false,
          error: 'Invalid Stripe webhook signature',
          status: 401,
        };
      }
    } catch (error) {
      console.error('Stripe webhook signature verification error:', error);
      return {
        valid: false,
        error: 'Webhook signature verification failed',
        status: 401,
      };
    }
  }

  // 2. CUSTOM WEBHOOK SIGNATURE VERIFICATION
  const webhookSecret = request.headers.get('x-webhook-signature');
  const webhookTimestamp = request.headers.get('x-webhook-timestamp');
  if (webhookSecret && webhookTimestamp) {
    try {
      const { verifyWebhookSignature } = await import('@/lib/security/webhook-validation');
      const body = await request.clone().text();
      const customWebhookSecret = process.env.WEBHOOK_SECRET;

      if (!customWebhookSecret) {
        return {
          valid: false,
          error: 'Custom webhook secret not configured',
          status: 500,
        };
      }

      const isValidCustomWebhook = await verifyWebhookSignature(
        webhookSecret,
        webhookTimestamp,
        body,
        customWebhookSecret
      );

      if (isValidCustomWebhook) {
        return { valid: true };
      } else {
        return {
          valid: false,
          error: 'Invalid custom webhook signature',
          status: 401,
        };
      }
    } catch (error) {
      console.error('Custom webhook signature verification error:', error);
      return {
        valid: false,
        error: 'Custom webhook signature verification failed',
        status: 401,
      };
    }
  }

  // 3. INTERNAL API KEY VERIFICATION (SECURE - Keep as is)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && process.env.INTERNAL_API_KEY) {
    // Use timing-safe comparison to prevent timing attacks
    const crypto = await import('crypto');
    try {
      const isValidApiKey = crypto.timingSafeEqual(
        Buffer.from(apiKey),
        Buffer.from(process.env.INTERNAL_API_KEY)
      );
      
      if (isValidApiKey) {
        return { valid: true };
      }
    } catch (error) {
      // Buffer lengths don't match, invalid key
      return {
        valid: false,
        error: 'Invalid API key',
        status: 401,
      };
    }
  }

  // 4. BEARER TOKEN (JWT) VERIFICATION
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      
      if (!token || token.length === 0) {
        return {
          valid: false,
          error: 'Empty bearer token',
          status: 401,
        };
      }

      // Create Supabase client for JWT verification
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Verify the JWT token with Supabase
      const { data: { user }, error } = await supabaseServiceRole.auth.getUser(token);

      if (error || !user) {
        return {
          valid: false,
          error: 'Invalid or expired bearer token',
          status: 401,
        };
      }

      // Additional security check: Verify user has purchase completion permissions
      const { data: profile } = await supabaseServiceRole
        .from('user_profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return {
          valid: false,
          error: 'User profile not found',
          status: 401,
        };
      }

      // Allow admin users and service accounts to complete purchases
      const allowedRoles = ['admin', 'service_account', 'super_admin'];
      if (!allowedRoles.includes(profile.role)) {
        return {
          valid: false,
          error: 'Insufficient permissions for purchase completion',
          status: 403,
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Bearer token verification error:', error);
      return {
        valid: false,
        error: 'Bearer token verification failed',
        status: 401,
      };
    }
  }

  // 5. NO VALID AUTHENTICATION PROVIDED
  return {
    valid: false,
    error: 'No valid authentication provided. Expected: Stripe webhook signature, custom webhook signature, internal API key, or valid bearer token',
    status: 401,
  };
}
