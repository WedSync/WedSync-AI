/**
 * WS-250: API Gateway Management System - Payment Gateway Connector
 * Team C - Round 1: Payment service API integration for wedding vendors
 *
 * Handles payment processing, refunds, disputes, and financial data
 * with wedding industry specific features like deposits, payment plans,
 * and vendor commission handling.
 */

import {
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
  IntegrationCredentials,
} from '../../types/integrations';
import ExternalAPIConnector, {
  ExternalAPIConfig,
} from './ExternalAPIConnector';

export interface PaymentGateway {
  id: string;
  name: string;
  provider: PaymentProvider;
  environment: 'sandbox' | 'live';
  credentials: PaymentCredentials;
  capabilities: PaymentCapability[];
  feeStructure: FeeStructure;
  supportedCurrencies: string[];
  supportedPaymentMethods: PaymentMethod[];
  webhookConfig?: WebhookConfiguration;
  weddingFeatures: WeddingPaymentFeatures;
  status: 'active' | 'inactive' | 'maintenance';
}

export type PaymentProvider =
  | 'stripe'
  | 'square'
  | 'paypal'
  | 'quickbooks'
  | 'wave'
  | 'freshbooks'
  | 'custom';

export interface PaymentCredentials extends IntegrationCredentials {
  publicKey?: string;
  secretKey: string;
  webhookSecret?: string;
  merchantId?: string;
  applicationId?: string;
  environment: 'sandbox' | 'live';
}

export interface PaymentCapability {
  name: string;
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface FeeStructure {
  processingFee: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  platformFee?: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  internationalFee?: {
    percentage: number;
    currency: string;
  };
  chargebackFee?: {
    amount: number;
    currency: string;
  };
}

export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'ach'
  | 'wire'
  | 'check'
  | 'cash'
  | 'apple_pay'
  | 'google_pay'
  | 'paypal'
  | 'venmo'
  | 'zelle';

export interface WebhookConfiguration {
  endpoint: string;
  events: PaymentWebhookEvent[];
  signingSecret: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

export type PaymentWebhookEvent =
  | 'payment.created'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.disputed'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.overdue';

export interface WeddingPaymentFeatures {
  depositsSupported: boolean;
  paymentPlansSupported: boolean;
  vendorCommissionSupported: boolean;
  multiVendorSplitSupported: boolean;
  refundPolicyEnforcement: boolean;
  weddingInsuranceIntegration: boolean;
  seasonalPricingSupported: boolean;
  emergencyPaymentSupport: boolean;
}

export interface PaymentRequest {
  id?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodDetails;
  customer: CustomerDetails;
  wedding: WeddingPaymentContext;
  description: string;
  metadata?: Record<string, any>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  returnUrl?: string;
  setupFutureUsage?: 'off_session' | 'on_session';
}

export interface PaymentMethodDetails {
  type: PaymentMethod;
  card?: {
    token?: string;
    number?: string;
    expiryMonth?: number;
    expiryYear?: number;
    cvc?: string;
    holderName?: string;
  };
  bankAccount?: {
    accountNumber?: string;
    routingNumber?: string;
    accountType?: 'checking' | 'savings';
    holderName?: string;
  };
  digital?: {
    email?: string;
    phone?: string;
  };
}

export interface CustomerDetails {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  weddingRole?: 'bride' | 'groom' | 'planner' | 'parent' | 'vendor';
}

export interface WeddingPaymentContext {
  weddingId: string;
  weddingDate: Date;
  vendorId: string;
  vendorCategory: string;
  serviceType: 'deposit' | 'milestone' | 'final' | 'additional';
  installmentNumber?: number;
  totalInstallments?: number;
  contractReference?: string;
  emergencyPayment?: boolean;
  weddingWeekPayment?: boolean;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  capturedAmount?: number;
  refundedAmount?: number;
  fees: {
    processing: number;
    platform?: number;
    total: number;
  };
  paymentMethod: {
    type: PaymentMethod;
    last4?: string;
    brand?: string;
    expiresAt?: string;
  };
  customer: {
    id: string;
    email: string;
    name: string;
  };
  created: Date;
  captured?: Date;
  failureReason?: string;
  receiptUrl?: string;
  nextAction?: {
    type: string;
    redirectUrl?: string;
    useStripeSdk?: boolean;
  };
  metadata?: Record<string, any>;
}

export type PaymentStatus =
  | 'pending'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason:
    | 'requested_by_customer'
    | 'fraudulent'
    | 'duplicate'
    | 'wedding_cancelled'
    | 'vendor_cancellation'
    | 'other';
  metadata?: Record<string, any>;
  refundApplicationFee?: boolean;
  reverseTransfer?: boolean;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  reason: string;
  created: Date;
  receiptNumber?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface PaymentPlan {
  id: string;
  weddingId: string;
  vendorId: string;
  totalAmount: number;
  currency: string;
  installments: PaymentInstallment[];
  status: 'active' | 'completed' | 'cancelled' | 'defaulted';
  created: Date;
  nextPaymentDate?: Date;
  gracePeriod?: number; // days
  lateFee?: {
    amount: number;
    type: 'fixed' | 'percentage';
  };
}

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled';
  paymentId?: string;
  paidDate?: Date;
  failureCount: number;
  metadata?: Record<string, any>;
}

export interface DisputeDetails {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason:
    | 'fraudulent'
    | 'unrecognized'
    | 'service_not_received'
    | 'duplicate'
    | 'other';
  status:
    | 'warning_needs_response'
    | 'warning_under_review'
    | 'warning_closed'
    | 'needs_response'
    | 'under_review'
    | 'charge_refunded'
    | 'won'
    | 'lost';
  evidence: {
    accessActivityLog?: string;
    billingAddress?: string;
    cancellationPolicy?: string;
    cancellationPolicyDisclosure?: string;
    cancellationRebuttal?: string;
    customerCommunication?: string;
    customerEmailAddress?: string;
    customerName?: string;
    customerPurchaseIp?: string;
    customerSignature?: string;
    duplicateChargeDocumentation?: string;
    duplicateChargeExplanation?: string;
    duplicateChargeId?: string;
    productDescription?: string;
    receipt?: string;
    refundPolicy?: string;
    refundPolicyDisclosure?: string;
    refundRefusalExplanation?: string;
    serviceDate?: string;
    serviceDocumentation?: string;
    shippingAddress?: string;
    shippingCarrier?: string;
    shippingDate?: string;
    shippingDocumentation?: string;
    shippingTrackingNumber?: string;
    uncategorizedFile?: string;
    uncategorizedText?: string;
  };
  created: Date;
  evidenceDueBy: Date;
  weddingRelated: boolean;
}

export interface PaymentAnalytics {
  totalVolume: number;
  totalCount: number;
  averageAmount: number;
  successRate: number;
  refundRate: number;
  disputeRate: number;
  topPaymentMethods: Array<{
    method: PaymentMethod;
    volume: number;
    count: number;
    percentage: number;
  }>;
  weddingMetrics: {
    seasonalTrends: Map<string, number>;
    vendorCategoryBreakdown: Map<string, number>;
    paymentTypeDistribution: Map<string, number>;
    averageWeddingValue: number;
  };
  feeAnalysis: {
    totalFees: number;
    averageFeePercentage: number;
    feesByMethod: Map<PaymentMethod, number>;
  };
}

export class PaymentGatewayConnector {
  private gateways: Map<string, PaymentGateway>;
  private activeConnectors: Map<string, ExternalAPIConnector>;
  private defaultGateway: string | null = null;
  private readonly weddingOptimized: boolean;

  constructor(
    options: {
      weddingOptimized?: boolean;
    } = {},
  ) {
    this.gateways = new Map();
    this.activeConnectors = new Map();
    this.weddingOptimized = options.weddingOptimized ?? true;

    // Initialize default gateways
    this.initializeDefaultGateways();
  }

  /**
   * Register a payment gateway
   */
  registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.id, gateway);

    // Create connector for this gateway
    const connector = this.createGatewayConnector(gateway);
    this.activeConnectors.set(gateway.id, connector);

    // Set as default if none exists
    if (!this.defaultGateway && gateway.status === 'active') {
      this.defaultGateway = gateway.id;
    }
  }

  /**
   * Process a single payment
   */
  async processPayment(
    request: PaymentRequest,
    gatewayId?: string,
  ): Promise<IntegrationResponse<PaymentResponse>> {
    try {
      const gateway = this.selectGateway(gatewayId, request.wedding);
      if (!gateway) {
        throw new IntegrationError(
          'No suitable payment gateway available',
          'NO_GATEWAY_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      const connector = this.activeConnectors.get(gateway.id);
      if (!connector) {
        throw new IntegrationError(
          `Gateway connector not initialized: ${gateway.id}`,
          'GATEWAY_NOT_INITIALIZED',
          ErrorCategory.SYSTEM,
        );
      }

      // Validate payment request
      this.validatePaymentRequest(request, gateway);

      // Apply wedding-specific processing rules
      const processedRequest = this.applyWeddingProcessingRules(
        request,
        gateway,
      );

      // Execute payment through gateway
      const result = await connector.executeRequest<any>(
        {
          path: '/payments',
          method: 'POST',
          requiresAuth: true,
        },
        this.formatPaymentRequestForGateway(processedRequest, gateway),
        {
          isWeddingWeekend: request.wedding.weddingWeekPayment || false,
          priority: request.wedding.emergencyPayment ? 'critical' : 'medium',
        },
      );

      if (!result.success) {
        throw new IntegrationError(
          result.error || 'Payment processing failed',
          'PAYMENT_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      // Transform response to standard format
      const paymentResponse = this.transformPaymentResponse(
        result.data,
        gateway,
      );

      return {
        success: true,
        data: paymentResponse,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Process refund for a payment
   */
  async processRefund(
    request: RefundRequest,
    gatewayId?: string,
  ): Promise<IntegrationResponse<RefundResponse>> {
    try {
      const gateway = this.selectGateway(gatewayId);
      if (!gateway) {
        throw new IntegrationError(
          'No suitable payment gateway available',
          'NO_GATEWAY_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      const connector = this.activeConnectors.get(gateway.id);
      if (!connector) {
        throw new IntegrationError(
          `Gateway connector not initialized: ${gateway.id}`,
          'GATEWAY_NOT_INITIALIZED',
          ErrorCategory.SYSTEM,
        );
      }

      // Execute refund through gateway
      const result = await connector.executeRequest<any>(
        {
          path: `/payments/${request.paymentId}/refunds`,
          method: 'POST',
          requiresAuth: true,
        },
        this.formatRefundRequestForGateway(request, gateway),
      );

      if (!result.success) {
        throw new IntegrationError(
          result.error || 'Refund processing failed',
          'REFUND_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      // Transform response to standard format
      const refundResponse = this.transformRefundResponse(result.data, gateway);

      return {
        success: true,
        data: refundResponse,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  /**
   * Create and manage payment plans for weddings
   */
  async createPaymentPlan(
    plan: Omit<PaymentPlan, 'id' | 'created' | 'status'>,
  ): Promise<IntegrationResponse<PaymentPlan>> {
    try {
      // Create payment plan with installments
      const paymentPlan: PaymentPlan = {
        id: this.generatePaymentPlanId(),
        ...plan,
        status: 'active',
        created: new Date(),
        nextPaymentDate: plan.installments[0]?.dueDate,
      };

      // Set up recurring payments or webhooks based on gateway capabilities
      const gateway = this.selectGateway();
      if (
        gateway?.capabilities.some(
          (cap) => cap.name === 'recurring_payments' && cap.enabled,
        )
      ) {
        await this.setupRecurringPayments(paymentPlan, gateway);
      }

      return {
        success: true,
        data: paymentPlan,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Payment plan creation failed',
      };
    }
  }

  /**
   * Process installment payment from a payment plan
   */
  async processInstallmentPayment(
    planId: string,
    installmentId: string,
    paymentMethod: PaymentMethodDetails,
  ): Promise<
    IntegrationResponse<{
      payment: PaymentResponse;
      updatedPlan: PaymentPlan;
    }>
  > {
    try {
      // This would integrate with the payment plan system
      // For now, return a mock response

      const paymentResponse: PaymentResponse = {
        id: this.generatePaymentId(),
        status: 'succeeded',
        amount: 1000, // This would come from the installment
        currency: 'USD',
        fees: {
          processing: 30,
          total: 30,
        },
        paymentMethod: {
          type: paymentMethod.type,
          last4: '4242',
          brand: 'visa',
        },
        customer: {
          id: 'customer_id',
          email: 'customer@example.com',
          name: 'Customer Name',
        },
        created: new Date(),
      };

      const updatedPlan: PaymentPlan = {
        id: planId,
        weddingId: 'wedding_id',
        vendorId: 'vendor_id',
        totalAmount: 5000,
        currency: 'USD',
        installments: [], // Would be populated with actual data
        status: 'active',
        created: new Date(),
      };

      return {
        success: true,
        data: {
          payment: paymentResponse,
          updatedPlan,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Installment payment failed',
      };
    }
  }

  /**
   * Handle payment dispute
   */
  async handleDispute(
    disputeId: string,
    evidence: Partial<DisputeDetails['evidence']>,
    gatewayId?: string,
  ): Promise<IntegrationResponse<DisputeDetails>> {
    try {
      const gateway = this.selectGateway(gatewayId);
      if (!gateway) {
        throw new IntegrationError(
          'No suitable payment gateway available',
          'NO_GATEWAY_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      const connector = this.activeConnectors.get(gateway.id);
      if (!connector) {
        throw new IntegrationError(
          `Gateway connector not initialized: ${gateway.id}`,
          'GATEWAY_NOT_INITIALIZED',
          ErrorCategory.SYSTEM,
        );
      }

      // Submit evidence to gateway
      const result = await connector.executeRequest<any>(
        {
          path: `/disputes/${disputeId}/submit_evidence`,
          method: 'POST',
          requiresAuth: true,
        },
        { evidence },
      );

      if (!result.success) {
        throw new IntegrationError(
          result.error || 'Dispute evidence submission failed',
          'DISPUTE_SUBMISSION_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      // Transform response
      const disputeResponse = this.transformDisputeResponse(
        result.data,
        gateway,
      );

      return {
        success: true,
        data: disputeResponse,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Dispute handling failed',
      };
    }
  }

  /**
   * Get payment analytics and insights
   */
  async getPaymentAnalytics(options: {
    startDate: Date;
    endDate: Date;
    gatewayId?: string;
    weddingId?: string;
    vendorId?: string;
  }): Promise<IntegrationResponse<PaymentAnalytics>> {
    try {
      const gateway = this.selectGateway(options.gatewayId);
      if (!gateway) {
        throw new IntegrationError(
          'No suitable payment gateway available',
          'NO_GATEWAY_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      const connector = this.activeConnectors.get(gateway.id);
      if (!connector) {
        throw new IntegrationError(
          `Gateway connector not initialized: ${gateway.id}`,
          'GATEWAY_NOT_INITIALIZED',
          ErrorCategory.SYSTEM,
        );
      }

      // Fetch analytics from gateway
      const result = await connector.executeRequest<any>(
        {
          path: '/analytics/payments',
          method: 'GET',
          requiresAuth: true,
        },
        {
          start_date: options.startDate.toISOString(),
          end_date: options.endDate.toISOString(),
          ...(options.weddingId && { wedding_id: options.weddingId }),
          ...(options.vendorId && { vendor_id: options.vendorId }),
        },
      );

      if (!result.success) {
        throw new IntegrationError(
          result.error || 'Analytics retrieval failed',
          'ANALYTICS_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      // Transform and enhance analytics for wedding industry
      const analytics = this.transformPaymentAnalytics(result.data, gateway);

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Analytics retrieval failed',
      };
    }
  }

  /**
   * Handle webhook events from payment gateways
   */
  async handleWebhook(
    gatewayId: string,
    event: {
      type: PaymentWebhookEvent;
      data: any;
      signature?: string;
      timestamp?: number;
    },
  ): Promise<IntegrationResponse<{ processed: boolean; actions: string[] }>> {
    try {
      const gateway = this.gateways.get(gatewayId);
      if (!gateway || !gateway.webhookConfig) {
        throw new IntegrationError(
          `Gateway or webhook configuration not found: ${gatewayId}`,
          'WEBHOOK_CONFIG_NOT_FOUND',
          ErrorCategory.SYSTEM,
        );
      }

      // Verify webhook signature if provided
      if (event.signature && gateway.webhookConfig.signingSecret) {
        const isValid = this.verifyWebhookSignature(
          event.signature,
          JSON.stringify(event.data),
          gateway.webhookConfig.signingSecret,
          gateway.provider,
        );

        if (!isValid) {
          throw new IntegrationError(
            'Invalid webhook signature',
            'INVALID_WEBHOOK_SIGNATURE',
            ErrorCategory.AUTHENTICATION,
          );
        }
      }

      // Process webhook event
      const actions = await this.processWebhookEvent(event, gateway);

      return {
        success: true,
        data: {
          processed: true,
          actions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  // Private methods

  private selectGateway(
    gatewayId?: string,
    weddingContext?: WeddingPaymentContext,
  ): PaymentGateway | null {
    if (gatewayId) {
      const gateway = this.gateways.get(gatewayId);
      return gateway?.status === 'active' ? gateway : null;
    }

    // Wedding-specific gateway selection logic
    if (this.weddingOptimized && weddingContext) {
      // Select gateway based on wedding context
      for (const [id, gateway] of this.gateways) {
        if (gateway.status !== 'active') continue;

        // Prefer gateways with wedding features for wedding payments
        if (
          weddingContext.emergencyPayment &&
          gateway.weddingFeatures.emergencyPaymentSupport
        ) {
          return gateway;
        }

        if (
          weddingContext.serviceType === 'deposit' &&
          gateway.weddingFeatures.depositsSupported
        ) {
          return gateway;
        }
      }
    }

    // Fall back to default gateway
    return this.defaultGateway
      ? this.gateways.get(this.defaultGateway) || null
      : null;
  }

  private createGatewayConnector(
    gateway: PaymentGateway,
  ): ExternalAPIConnector {
    const config: ExternalAPIConfig = {
      apiUrl: this.getGatewayAPIUrl(gateway.provider, gateway.environment),
      baseUrl: this.getGatewayAPIUrl(gateway.provider, gateway.environment),
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${gateway.credentials.secretKey}`,
        'Content-Type': 'application/json',
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 60000,
        monitoringWindow: 300000,
      },
      weddingDayProtection: true,
    };

    return new ExternalAPIConnector(config, gateway.credentials);
  }

  private getGatewayAPIUrl(
    provider: PaymentProvider,
    environment: 'sandbox' | 'live',
  ): string {
    const urls = {
      stripe: {
        sandbox: 'https://api.stripe.com/v1',
        live: 'https://api.stripe.com/v1',
      },
      square: {
        sandbox: 'https://connect.squareupsandbox.com/v2',
        live: 'https://connect.squareup.com/v2',
      },
      paypal: {
        sandbox: 'https://api.sandbox.paypal.com/v2',
        live: 'https://api.paypal.com/v2',
      },
    };

    return urls[provider]?.[environment] || 'https://api.example.com/v1';
  }

  private validatePaymentRequest(
    request: PaymentRequest,
    gateway: PaymentGateway,
  ): void {
    if (request.amount <= 0) {
      throw new IntegrationError(
        'Payment amount must be greater than zero',
        'INVALID_AMOUNT',
        ErrorCategory.VALIDATION,
      );
    }

    if (!gateway.supportedCurrencies.includes(request.currency)) {
      throw new IntegrationError(
        `Currency ${request.currency} not supported by gateway ${gateway.id}`,
        'UNSUPPORTED_CURRENCY',
        ErrorCategory.VALIDATION,
      );
    }

    if (!gateway.supportedPaymentMethods.includes(request.paymentMethod.type)) {
      throw new IntegrationError(
        `Payment method ${request.paymentMethod.type} not supported by gateway ${gateway.id}`,
        'UNSUPPORTED_PAYMENT_METHOD',
        ErrorCategory.VALIDATION,
      );
    }
  }

  private applyWeddingProcessingRules(
    request: PaymentRequest,
    gateway: PaymentGateway,
  ): PaymentRequest {
    let processedRequest = { ...request };

    // Apply wedding day protection
    if (request.wedding.weddingWeekPayment) {
      processedRequest.captureMethod = 'automatic';
      processedRequest.confirmationMethod = 'automatic';

      // Add wedding week metadata
      processedRequest.metadata = {
        ...processedRequest.metadata,
        wedding_week_payment: 'true',
        priority: 'high',
      };
    }

    // Apply emergency payment processing
    if (request.wedding.emergencyPayment) {
      processedRequest.captureMethod = 'automatic';
      processedRequest.metadata = {
        ...processedRequest.metadata,
        emergency_payment: 'true',
        priority: 'critical',
      };
    }

    // Apply deposit-specific rules
    if (
      request.wedding.serviceType === 'deposit' &&
      gateway.weddingFeatures.depositsSupported
    ) {
      processedRequest.metadata = {
        ...processedRequest.metadata,
        service_type: 'wedding_deposit',
        refund_policy: 'wedding_specific',
      };
    }

    return processedRequest;
  }

  private formatPaymentRequestForGateway(
    request: PaymentRequest,
    gateway: PaymentGateway,
  ): any {
    // Transform request to gateway-specific format
    switch (gateway.provider) {
      case 'stripe':
        return this.formatForStripe(request);
      case 'square':
        return this.formatForSquare(request);
      case 'paypal':
        return this.formatForPayPal(request);
      default:
        return request;
    }
  }

  private formatForStripe(request: PaymentRequest): any {
    return {
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      payment_method_types: [
        request.paymentMethod.type === 'card'
          ? 'card'
          : request.paymentMethod.type,
      ],
      customer: {
        email: request.customer.email,
        name: request.customer.name,
        phone: request.customer.phone,
      },
      description: request.description,
      metadata: {
        ...request.metadata,
        wedding_id: request.wedding.weddingId,
        vendor_id: request.wedding.vendorId,
        service_type: request.wedding.serviceType,
      },
      capture_method: request.captureMethod || 'automatic',
      confirmation_method: request.confirmationMethod || 'automatic',
    };
  }

  private formatForSquare(request: PaymentRequest): any {
    return {
      amount_money: {
        amount: request.amount,
        currency: request.currency,
      },
      source_id: request.paymentMethod.card?.token,
      buyer_email_address: request.customer.email,
      note: request.description,
      app_fee_money: gateway.feeStructure.platformFee
        ? {
            amount: Math.floor(
              (request.amount * gateway.feeStructure.platformFee.percentage) /
                100,
            ),
            currency: request.currency,
          }
        : undefined,
    };
  }

  private formatForPayPal(request: PaymentRequest): any {
    return {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: request.currency,
            value: (request.amount / 100).toFixed(2), // PayPal uses decimal amounts
          },
          description: request.description,
          custom_id: request.wedding.weddingId,
          invoice_id: request.id,
        },
      ],
      payer: {
        email_address: request.customer.email,
        name: {
          given_name:
            request.customer.name.split(' ')[0] || request.customer.name,
          surname: request.customer.name.split(' ').slice(1).join(' ') || '',
        },
      },
    };
  }

  private transformPaymentResponse(
    data: any,
    gateway: PaymentGateway,
  ): PaymentResponse {
    // Transform gateway-specific response to standard format
    switch (gateway.provider) {
      case 'stripe':
        return this.transformStripeResponse(data);
      case 'square':
        return this.transformSquareResponse(data);
      case 'paypal':
        return this.transformPayPalResponse(data);
      default:
        return data as PaymentResponse;
    }
  }

  private transformStripeResponse(data: any): PaymentResponse {
    return {
      id: data.id,
      status: this.mapStripeStatus(data.status),
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      capturedAmount: data.amount_captured,
      refundedAmount: data.amount_refunded,
      fees: {
        processing: data.application_fee_amount || 0,
        total: data.application_fee_amount || 0,
      },
      paymentMethod: {
        type: 'card',
        last4: data.payment_method?.card?.last4,
        brand: data.payment_method?.card?.brand,
        expiresAt:
          data.payment_method?.card?.exp_month &&
          data.payment_method?.card?.exp_year
            ? `${data.payment_method.card.exp_month}/${data.payment_method.card.exp_year}`
            : undefined,
      },
      customer: {
        id: data.customer,
        email: data.receipt_email || '',
        name: data.billing_details?.name || '',
      },
      created: new Date(data.created * 1000),
      captured: data.captured ? new Date(data.created * 1000) : undefined,
      failureReason: data.last_payment_error?.message,
      receiptUrl: data.receipt_url,
      nextAction: data.next_action
        ? {
            type: data.next_action.type,
            redirectUrl: data.next_action.redirect_to_url?.url,
            useStripeSdk: data.next_action.use_stripe_sdk,
          }
        : undefined,
      metadata: data.metadata,
    };
  }

  private transformSquareResponse(data: any): PaymentResponse {
    const payment = data.payment;
    return {
      id: payment.id,
      status: this.mapSquareStatus(payment.status),
      amount: payment.amount_money.amount,
      currency: payment.amount_money.currency,
      fees: {
        processing: payment.processing_fee?.[0]?.amount_money?.amount || 0,
        total: payment.processing_fee?.[0]?.amount_money?.amount || 0,
      },
      paymentMethod: {
        type: 'card',
        last4: payment.card_details?.card?.last_4,
        brand: payment.card_details?.card?.card_brand?.toLowerCase(),
      },
      customer: {
        id: payment.buyer_email_address,
        email: payment.buyer_email_address,
        name: '',
      },
      created: new Date(payment.created_at),
      receiptUrl: payment.receipt_url,
      metadata: {},
    };
  }

  private transformPayPalResponse(data: any): PaymentResponse {
    const purchaseUnit = data.purchase_units?.[0];
    return {
      id: data.id,
      status: this.mapPayPalStatus(data.status),
      amount: Math.round(parseFloat(purchaseUnit?.amount?.value || '0') * 100),
      currency: purchaseUnit?.amount?.currency_code || 'USD',
      fees: {
        processing: 0, // PayPal doesn't expose fees in response
        total: 0,
      },
      paymentMethod: {
        type: 'paypal',
      },
      customer: {
        id: data.payer?.payer_id || '',
        email: data.payer?.email_address || '',
        name: data.payer?.name
          ? `${data.payer.name.given_name} ${data.payer.name.surname}`
          : '',
      },
      created: new Date(data.create_time),
      receiptUrl: data.links?.find((link: any) => link.rel === 'self')?.href,
      metadata: {},
    };
  }

  private mapStripeStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'requires_confirmation',
      requires_action: 'requires_action',
      processing: 'processing',
      succeeded: 'succeeded',
      canceled: 'cancelled',
    };
    return statusMap[status] || 'failed';
  }

  private mapSquareStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      APPROVED: 'succeeded',
      PENDING: 'processing',
      COMPLETED: 'succeeded',
      CANCELED: 'cancelled',
      FAILED: 'failed',
    };
    return statusMap[status] || 'failed';
  }

  private mapPayPalStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      CREATED: 'pending',
      SAVED: 'pending',
      APPROVED: 'requires_confirmation',
      VOIDED: 'cancelled',
      COMPLETED: 'succeeded',
      PAYER_ACTION_REQUIRED: 'requires_action',
    };
    return statusMap[status] || 'failed';
  }

  private formatRefundRequestForGateway(
    request: RefundRequest,
    gateway: PaymentGateway,
  ): any {
    switch (gateway.provider) {
      case 'stripe':
        return {
          payment_intent: request.paymentId,
          amount: request.amount,
          reason: request.reason,
          metadata: request.metadata,
          refund_application_fee: request.refundApplicationFee,
          reverse_transfer: request.reverseTransfer,
        };
      case 'square':
        return {
          amount_money: request.amount
            ? {
                amount: request.amount,
                currency: 'USD', // Would be determined from original payment
              }
            : undefined,
          reason: request.reason,
        };
      case 'paypal':
        return {
          amount: request.amount
            ? {
                value: (request.amount / 100).toFixed(2),
                currency_code: 'USD',
              }
            : undefined,
          note_to_payer: request.reason,
        };
      default:
        return request;
    }
  }

  private transformRefundResponse(
    data: any,
    gateway: PaymentGateway,
  ): RefundResponse {
    // Similar transformation logic as payment response
    return {
      id: data.id,
      paymentId: data.payment_intent || data.payment_id,
      amount: data.amount,
      currency: data.currency?.toUpperCase() || 'USD',
      status: 'succeeded', // Would map actual status
      reason: data.reason || 'requested_by_customer',
      created: new Date(data.created * 1000 || Date.now()),
      receiptNumber: data.receipt_number,
      failureReason: data.failure_reason,
      metadata: data.metadata || {},
    };
  }

  private transformDisputeResponse(
    data: any,
    gateway: PaymentGateway,
  ): DisputeDetails {
    // Transform gateway-specific dispute data
    return {
      id: data.id,
      paymentId: data.charge,
      amount: data.amount,
      currency: data.currency?.toUpperCase() || 'USD',
      reason: data.reason,
      status: data.status,
      evidence: data.evidence || {},
      created: new Date(data.created * 1000),
      evidenceDueBy: new Date(data.evidence_details?.due_by * 1000),
      weddingRelated: data.metadata?.wedding_id ? true : false,
    };
  }

  private transformPaymentAnalytics(
    data: any,
    gateway: PaymentGateway,
  ): PaymentAnalytics {
    return {
      totalVolume: data.total_volume || 0,
      totalCount: data.total_count || 0,
      averageAmount: data.average_amount || 0,
      successRate: data.success_rate || 0,
      refundRate: data.refund_rate || 0,
      disputeRate: data.dispute_rate || 0,
      topPaymentMethods: data.payment_methods || [],
      weddingMetrics: {
        seasonalTrends: new Map(Object.entries(data.seasonal_trends || {})),
        vendorCategoryBreakdown: new Map(
          Object.entries(data.vendor_breakdown || {}),
        ),
        paymentTypeDistribution: new Map(
          Object.entries(data.payment_types || {}),
        ),
        averageWeddingValue: data.average_wedding_value || 0,
      },
      feeAnalysis: {
        totalFees: data.total_fees || 0,
        averageFeePercentage: data.average_fee_percentage || 0,
        feesByMethod: new Map(Object.entries(data.fees_by_method || {})),
      },
    };
  }

  private async setupRecurringPayments(
    plan: PaymentPlan,
    gateway: PaymentGateway,
  ): Promise<void> {
    // Set up recurring payments or subscription for the payment plan
    // This would integrate with the gateway's subscription/recurring payment features
  }

  private verifyWebhookSignature(
    signature: string,
    payload: string,
    secret: string,
    provider: PaymentProvider,
  ): boolean {
    // Implement signature verification based on provider
    // Each provider has different signature verification methods
    return true; // Placeholder
  }

  private async processWebhookEvent(
    event: { type: PaymentWebhookEvent; data: any },
    gateway: PaymentGateway,
  ): Promise<string[]> {
    const actions: string[] = [];

    switch (event.type) {
      case 'payment.succeeded':
        actions.push('Update payment status');
        actions.push('Send confirmation email');
        if (event.data.metadata?.wedding_id) {
          actions.push('Update wedding payment timeline');
        }
        break;

      case 'payment.failed':
        actions.push('Update payment status');
        actions.push('Send failure notification');
        if (event.data.metadata?.wedding_week_payment) {
          actions.push('Activate emergency payment protocol');
        }
        break;

      case 'payment.refunded':
        actions.push('Update payment status');
        actions.push('Process refund in accounting system');
        break;

      case 'payment.disputed':
        actions.push('Create dispute case');
        actions.push('Notify vendor of dispute');
        if (event.data.wedding_related) {
          actions.push('Activate wedding dispute protocol');
        }
        break;

      default:
        actions.push('Log webhook event');
    }

    return actions;
  }

  private generatePaymentId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePaymentPlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultGateways(): void {
    // Initialize with Stripe as default gateway
    const stripeGateway: PaymentGateway = {
      id: 'stripe_default',
      name: 'Stripe',
      provider: 'stripe',
      environment: 'sandbox',
      credentials: {
        userId: 'system',
        organizationId: 'system',
        provider: 'stripe',
        apiKey: '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        environment: 'sandbox',
      },
      capabilities: [
        { name: 'payments', enabled: true },
        { name: 'refunds', enabled: true },
        { name: 'disputes', enabled: true },
        { name: 'recurring_payments', enabled: true },
        { name: 'webhooks', enabled: true },
      ],
      feeStructure: {
        processingFee: {
          percentage: 2.9,
          fixed: 30,
          currency: 'USD',
        },
      },
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedPaymentMethods: [
        'card',
        'bank_transfer',
        'apple_pay',
        'google_pay',
      ],
      weddingFeatures: {
        depositsSupported: true,
        paymentPlansSupported: true,
        vendorCommissionSupported: true,
        multiVendorSplitSupported: true,
        refundPolicyEnforcement: true,
        weddingInsuranceIntegration: false,
        seasonalPricingSupported: true,
        emergencyPaymentSupport: true,
      },
      status: 'active',
    };

    this.registerGateway(stripeGateway);
  }
}

export default PaymentGatewayConnector;
