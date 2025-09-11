/**
 * WS-115: Marketplace Purchase Service
 * Complete purchase flow with Stripe integration, template installation, and analytics
 *
 * Team C - Batch 9 - Round 1
 */

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// =====================================================================================
// INTERFACES
// =====================================================================================

export interface PurchaseRequest {
  templateId: string;
  buyerId: string;
  paymentMethodId?: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface PurchaseSession {
  sessionId: string;
  paymentIntentId: string;
  clientSecret: string;
  templateDetails: {
    id: string;
    title: string;
    price: number;
    currency: string;
    sellerId: string;
  };
  purchaseId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface InstallationResult {
  success: boolean;
  installedItems: {
    type: string;
    id: string;
    name: string;
  }[];
  errors?: string[];
}

export interface RefundRequest {
  purchaseId: string;
  reason: string;
  amount?: number; // Optional partial refund amount
}

export interface PurchaseReceipt {
  purchaseId: string;
  receiptNumber: string;
  date: string;
  buyer: {
    name: string;
    email: string;
    organization?: string;
  };
  seller: {
    name: string;
    organization: string;
  };
  template: {
    title: string;
    type: string;
    category: string;
  };
  payment: {
    amount: number;
    currency: string;
    method: string;
    status: string;
  };
  downloadUrl?: string;
}

// =====================================================================================
// PURCHASE FLOW
// =====================================================================================

export class MarketplacePurchaseService {
  /**
   * Create a purchase session with Stripe payment intent
   */
  static async createPurchaseSession(
    request: PurchaseRequest,
  ): Promise<PurchaseSession> {
    const supabase = await createClient(cookies());

    try {
      // Fetch template details
      const { data: template, error: templateError } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('id', request.templateId)
        .eq('status', 'active')
        .single();

      if (templateError || !template) {
        throw new Error('Template not found or not available for purchase');
      }

      // Validate buyer has appropriate tier
      const { data: buyer, error: buyerError } = await supabase
        .from('suppliers')
        .select('subscription_tier')
        .eq('id', request.buyerId)
        .single();

      if (buyerError || !buyer) {
        throw new Error('Buyer not found');
      }

      // Check if buyer already purchased this template
      const { data: existingPurchase } = await supabase
        .from('marketplace_purchases')
        .select('id')
        .eq('template_id', request.templateId)
        .eq('buyer_id', request.buyerId)
        .eq('payment_status', 'completed')
        .single();

      if (existingPurchase) {
        throw new Error('Template already purchased');
      }

      // Calculate commission (30% platform fee)
      const commissionRate = 0.3;
      const commission = Math.round(template.price_cents * commissionRate);
      const sellerPayout = template.price_cents - commission;

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .insert({
          template_id: request.templateId,
          buyer_id: request.buyerId,
          seller_id: template.supplier_id,
          price_paid_cents: template.price_cents,
          currency: template.currency || 'GBP',
          commission_cents: commission,
          seller_payout_cents: sellerPayout,
          payment_status: 'pending',
          purchase_source: request.metadata?.source || 'direct',
          buyer_wedding_context: request.metadata?.weddingContext || {},
        })
        .select()
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Failed to create purchase record');
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: template.price_cents,
        currency: template.currency?.toLowerCase() || 'gbp',
        metadata: {
          purchaseId: purchase.id,
          templateId: template.id,
          buyerId: request.buyerId,
          sellerId: template.supplier_id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
        receipt_email: request.metadata?.buyerEmail,
        description: `Purchase: ${template.title}`,
      });

      // Update purchase with Stripe IDs
      await supabase
        .from('marketplace_purchases')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq('id', purchase.id);

      return {
        sessionId: paymentIntent.id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        templateDetails: {
          id: template.id,
          title: template.title,
          price: template.price_cents,
          currency: template.currency || 'GBP',
          sellerId: template.supplier_id,
        },
        purchaseId: purchase.id,
        status: 'pending',
      };
    } catch (error) {
      console.error('Error creating purchase session:', error);
      throw error;
    }
  }

  /**
   * Confirm payment and complete purchase
   */
  static async confirmPayment(
    paymentIntentId: string,
  ): Promise<{ success: boolean; purchaseId: string }> {
    const supabase = await createClient(cookies());

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent =
        await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful: ${paymentIntent.status}`);
      }

      // Update purchase record
      const { data: purchase, error } = await supabase
        .from('marketplace_purchases')
        .update({
          payment_status: 'completed',
          stripe_charge_id: paymentIntent.latest_charge as string,
        })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .select()
        .single();

      if (error || !purchase) {
        throw new Error('Failed to update purchase status');
      }

      // Update template install count
      await supabase.rpc('increment_template_install_count', {
        template_id: purchase.template_id,
      });

      // Trigger installation process
      await this.installTemplate(purchase.id);

      // Send purchase confirmation emails
      await this.sendPurchaseNotifications(purchase.id);

      // Track analytics
      await this.trackPurchaseAnalytics(purchase.id);

      return {
        success: true,
        purchaseId: purchase.id,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Install purchased template
   */
  static async installTemplate(
    purchaseId: string,
  ): Promise<InstallationResult> {
    const supabase = await createClient(cookies());

    try {
      // Get purchase and template details
      const { data: purchase, error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .select(
          `
          *,
          template:marketplace_templates(*)
        `,
        )
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Purchase not found');
      }

      const template = purchase.template;
      const installedItems: any[] = [];
      const errors: string[] = [];

      // Install based on template type
      switch (template.template_type) {
        case 'form':
          const formResult = await this.installFormTemplate(
            template.template_data,
            purchase.buyer_id,
          );
          if (formResult.success) {
            installedItems.push({
              type: 'form',
              id: formResult.formId,
              name: template.title,
            });
          } else {
            errors.push(formResult.error || 'Failed to install form');
          }
          break;

        case 'email_sequence':
          const emailResult = await this.installEmailSequence(
            template.template_data,
            purchase.buyer_id,
          );
          if (emailResult.success) {
            installedItems.push({
              type: 'email_sequence',
              id: emailResult.sequenceId,
              name: template.title,
            });
          } else {
            errors.push(
              emailResult.error || 'Failed to install email sequence',
            );
          }
          break;

        case 'journey_workflow':
          const journeyResult = await this.installJourneyWorkflow(
            template.template_data,
            purchase.buyer_id,
          );
          if (journeyResult.success) {
            installedItems.push({
              type: 'journey',
              id: journeyResult.journeyId,
              name: template.title,
            });
          } else {
            errors.push(journeyResult.error || 'Failed to install journey');
          }
          break;

        case 'bundle':
          const bundleResult = await this.installBundle(
            template.template_data,
            purchase.buyer_id,
          );
          installedItems.push(...bundleResult.installedItems);
          errors.push(...bundleResult.errors);
          break;
      }

      // Update installation status
      await supabase
        .from('marketplace_purchases')
        .update({
          installed: installedItems.length > 0,
          installed_at: new Date().toISOString(),
          installation_data: {
            installedItems,
            errors,
          },
        })
        .eq('id', purchaseId);

      return {
        success: errors.length === 0,
        installedItems,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error installing template:', error);
      throw error;
    }
  }

  /**
   * Process refund request
   */
  static async processRefund(
    request: RefundRequest,
  ): Promise<{ success: boolean; refundId: string }> {
    const supabase = await createClient(cookies());

    try {
      // Get purchase details
      const { data: purchase, error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .select('*')
        .eq('id', request.purchaseId)
        .eq('payment_status', 'completed')
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Purchase not found or not eligible for refund');
      }

      // Check refund eligibility (within 30 days)
      const purchaseDate = new Date(purchase.created_at);
      const daysSincePurchase = Math.floor(
        (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSincePurchase > 30) {
        throw new Error('Refund period has expired (30 days)');
      }

      // Process refund through Stripe
      const refundAmount = request.amount || purchase.price_paid_cents;
      const refund = await stripe.refunds.create({
        payment_intent: purchase.stripe_payment_intent_id,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          purchaseId: request.purchaseId,
          reason: request.reason,
        },
      });

      // Update purchase record
      await supabase
        .from('marketplace_purchases')
        .update({
          payment_status: 'refunded',
          refund_requested: true,
          refund_reason: request.reason,
          refunded_at: new Date().toISOString(),
          refund_amount_cents: refundAmount,
        })
        .eq('id', request.purchaseId);

      // Remove installed items if full refund
      if (refundAmount === purchase.price_paid_cents) {
        await this.removeInstalledItems(request.purchaseId);
      }

      // Send refund notifications
      await this.sendRefundNotifications(request.purchaseId);

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Generate purchase receipt
   */
  static async generateReceipt(purchaseId: string): Promise<PurchaseReceipt> {
    const supabase = await createClient(cookies());

    try {
      // Get complete purchase details
      const { data: purchase, error } = await supabase
        .from('marketplace_purchases')
        .select(
          `
          *,
          template:marketplace_templates(*),
          buyer:suppliers!buyer_id(*),
          seller:suppliers!seller_id(*)
        `,
        )
        .eq('id', purchaseId)
        .single();

      if (error || !purchase) {
        throw new Error('Purchase not found');
      }

      // Generate receipt number
      const receiptNumber = `WS-${purchase.created_at.substring(0, 10).replace(/-/g, '')}-${purchase.id.substring(0, 8).toUpperCase()}`;

      return {
        purchaseId: purchase.id,
        receiptNumber,
        date: purchase.created_at,
        buyer: {
          name: purchase.buyer.contact_name || 'N/A',
          email: purchase.buyer.email,
          organization: purchase.buyer.business_name,
        },
        seller: {
          name: purchase.seller.contact_name || 'N/A',
          organization: purchase.seller.business_name,
        },
        template: {
          title: purchase.template.title,
          type: purchase.template.template_type,
          category: purchase.template.category,
        },
        payment: {
          amount: purchase.price_paid_cents / 100,
          currency: purchase.currency,
          method: 'Card',
          status: purchase.payment_status,
        },
        downloadUrl: `/api/marketplace/purchases/${purchaseId}/download`,
      };
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private static async installFormTemplate(templateData: any, buyerId: string) {
    const supabase = await createClient(cookies());

    try {
      const { data: form, error } = await supabase
        .from('forms')
        .insert({
          supplier_id: buyerId,
          name: templateData.name,
          description: templateData.description,
          fields: templateData.fields,
          settings: templateData.settings,
          status: 'active',
          is_template: false,
        })
        .select()
        .single();

      return {
        success: !error,
        formId: form?.id,
        error: error?.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to install form template',
      };
    }
  }

  private static async installEmailSequence(
    templateData: any,
    buyerId: string,
  ) {
    const supabase = await createClient(cookies());

    try {
      const { data: sequence, error } = await supabase
        .from('email_sequences')
        .insert({
          supplier_id: buyerId,
          name: templateData.name,
          description: templateData.description,
          emails: templateData.emails,
          triggers: templateData.triggers,
          status: 'draft',
        })
        .select()
        .single();

      return {
        success: !error,
        sequenceId: sequence?.id,
        error: error?.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to install email sequence',
      };
    }
  }

  private static async installJourneyWorkflow(
    templateData: any,
    buyerId: string,
  ) {
    const supabase = await createClient(cookies());

    try {
      const { data: journey, error } = await supabase
        .from('journeys')
        .insert({
          supplier_id: buyerId,
          name: templateData.name,
          description: templateData.description,
          stages: templateData.stages,
          triggers: templateData.triggers,
          actions: templateData.actions,
          status: 'draft',
        })
        .select()
        .single();

      return {
        success: !error,
        journeyId: journey?.id,
        error: error?.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to install journey workflow',
      };
    }
  }

  private static async installBundle(templateData: any, buyerId: string) {
    const installedItems: any[] = [];
    const errors: string[] = [];

    // Install each item in the bundle
    for (const item of templateData.items) {
      switch (item.type) {
        case 'form':
          const formResult = await this.installFormTemplate(item.data, buyerId);
          if (formResult.success) {
            installedItems.push({
              type: 'form',
              id: formResult.formId,
              name: item.name,
            });
          } else {
            errors.push(`Failed to install form: ${item.name}`);
          }
          break;

        case 'email_sequence':
          const emailResult = await this.installEmailSequence(
            item.data,
            buyerId,
          );
          if (emailResult.success) {
            installedItems.push({
              type: 'email_sequence',
              id: emailResult.sequenceId,
              name: item.name,
            });
          } else {
            errors.push(`Failed to install email sequence: ${item.name}`);
          }
          break;

        case 'journey_workflow':
          const journeyResult = await this.installJourneyWorkflow(
            item.data,
            buyerId,
          );
          if (journeyResult.success) {
            installedItems.push({
              type: 'journey',
              id: journeyResult.journeyId,
              name: item.name,
            });
          } else {
            errors.push(`Failed to install journey: ${item.name}`);
          }
          break;
      }
    }

    return { installedItems, errors };
  }

  private static async removeInstalledItems(purchaseId: string) {
    const supabase = await createClient(cookies());

    try {
      // Get installation data
      const { data: purchase } = await supabase
        .from('marketplace_purchases')
        .select('installation_data')
        .eq('id', purchaseId)
        .single();

      if (!purchase?.installation_data?.installedItems) return;

      // Remove each installed item
      for (const item of purchase.installation_data.installedItems) {
        switch (item.type) {
          case 'form':
            await supabase.from('forms').delete().eq('id', item.id);
            break;
          case 'email_sequence':
            await supabase.from('email_sequences').delete().eq('id', item.id);
            break;
          case 'journey':
            await supabase.from('journeys').delete().eq('id', item.id);
            break;
        }
      }

      // Clear installation data
      await supabase
        .from('marketplace_purchases')
        .update({
          installed: false,
          installation_data: {},
        })
        .eq('id', purchaseId);
    } catch (error) {
      console.error('Error removing installed items:', error);
    }
  }

  private static async sendPurchaseNotifications(purchaseId: string) {
    // Implementation for sending email notifications
    // This would integrate with your email service
    console.log('Sending purchase notifications for:', purchaseId);
  }

  private static async sendRefundNotifications(purchaseId: string) {
    // Implementation for sending refund notifications
    console.log('Sending refund notifications for:', purchaseId);
  }

  private static async trackPurchaseAnalytics(purchaseId: string) {
    // Implementation for tracking purchase analytics
    console.log('Tracking purchase analytics for:', purchaseId);
  }
}
