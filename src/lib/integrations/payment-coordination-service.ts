import { EventEmitter } from 'events';
import { z } from 'zod';

// Payment Coordination Types
export const PaymentSplitSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  totalAmount: z.number().positive(),
  currency: z.string().length(3), // ISO 4217
  splits: z.array(
    z.object({
      vendorId: z.string(),
      vendorType: z.enum([
        'photographer',
        'venue',
        'catering',
        'florist',
        'dj',
        'videographer',
        'coordinator',
        'other',
      ]),
      amount: z.number().positive(),
      percentage: z.number().min(0).max(100),
      status: z.enum([
        'pending',
        'authorized',
        'captured',
        'failed',
        'refunded',
      ]),
      paymentMethodId: z.string().optional(),
      dueDate: z.date(),
      description: z.string(),
      metadata: z.record(z.any()).optional(),
    }),
  ),
  escrowAccount: z.string().optional(),
  releaseConditions: z.array(
    z.object({
      type: z.enum(['milestone', 'date', 'approval', 'delivery']),
      description: z.string(),
      status: z.enum(['pending', 'met', 'failed']),
      dueDate: z.date().optional(),
      approverIds: z.array(z.string()).optional(),
    }),
  ),
  coordinatorFee: z.object({
    amount: z.number(),
    percentage: z.number().min(0).max(10), // WedSync takes 3-7% coordination fee
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

export const PaymentEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'payment_initiated',
    'payment_authorized',
    'payment_captured',
    'payment_failed',
    'payment_refunded',
    'split_updated',
    'milestone_reached',
  ]),
  paymentSplitId: z.string(),
  vendorId: z.string().optional(),
  amount: z.number().optional(),
  timestamp: z.date(),
  data: z.record(z.any()),
  source: z.object({
    system: z.string(),
    endpoint: z.string().optional(),
    userId: z.string().optional(),
  }),
});

export type PaymentSplit = z.infer<typeof PaymentSplitSchema>;
export type PaymentEvent = z.infer<typeof PaymentEventSchema>;

// Payment Integration Configuration
export interface PaymentProviderConfig {
  provider: 'stripe' | 'square' | 'paypal' | 'wedding_wire_payments';
  credentials: Record<string, string>;
  enabled: boolean;
  testMode: boolean;
  webhookUrl: string;
  supportedCurrencies: string[];
  features: {
    escrow: boolean;
    splitting: boolean;
    recurring: boolean;
    refunds: boolean;
  };
}

// Wedding Payment Milestones
export const WeddingMilestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'booking',
    'contract_signed',
    'final_headcount',
    'rehearsal',
    'ceremony',
    'reception',
    'cleanup',
  ]),
  scheduledDate: z.date(),
  paymentPercentage: z.number().min(0).max(100),
  requiredApprovals: z.array(
    z.object({
      role: z.enum(['couple', 'coordinator', 'venue', 'vendor']),
      userId: z.string(),
      status: z.enum(['pending', 'approved', 'rejected']),
    }),
  ),
  dependencies: z.array(z.string()), // Other milestone IDs
  isWeddingDay: z.boolean(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export type WeddingMilestone = z.infer<typeof WeddingMilestoneSchema>;

export class PaymentCoordinationService extends EventEmitter {
  private paymentProviders: Map<string, PaymentProviderConfig> = new Map();
  private activePaymentSplits: Map<string, PaymentSplit> = new Map();
  private milestoneTemplates: Map<string, WeddingMilestone[]> = new Map();

  constructor() {
    super();
    this.initializeWeddingMilestoneTemplates();
    this.setupPaymentEventHandlers();
  }

  /**
   * Creates a coordinated payment split across multiple wedding vendors
   */
  async createPaymentSplit(request: {
    weddingId: string;
    totalAmount: number;
    currency: string;
    vendorSplits: Array<{
      vendorId: string;
      vendorType: PaymentSplit['splits'][0]['vendorType'];
      percentage: number;
      dueDate: Date;
      description: string;
    }>;
    escrowEnabled?: boolean;
    milestoneBasedRelease?: boolean;
  }): Promise<{ success: boolean; paymentSplitId?: string; error?: string }> {
    try {
      // Validate total percentage equals 100%
      const totalPercentage = request.vendorSplits.reduce(
        (sum, split) => sum + split.percentage,
        0,
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(
          `Vendor split percentages must equal 100%, got ${totalPercentage}%`,
        );
      }

      const coordinatorFee = this.calculateCoordinatorFee(request.totalAmount);
      const netAmount = request.totalAmount - coordinatorFee.amount;

      const paymentSplit: PaymentSplit = {
        id: this.generateId('ps'),
        weddingId: request.weddingId,
        totalAmount: request.totalAmount,
        currency: request.currency,
        splits: request.vendorSplits.map((split) => ({
          vendorId: split.vendorId,
          vendorType: split.vendorType,
          amount: Math.round((netAmount * split.percentage) / 100),
          percentage: split.percentage,
          status: 'pending',
          dueDate: split.dueDate,
          description: split.description,
        })),
        escrowAccount: request.escrowEnabled
          ? await this.createEscrowAccount(request.weddingId)
          : undefined,
        releaseConditions: request.milestoneBasedRelease
          ? await this.createMilestoneReleaseConditions(request.weddingId)
          : [],
        coordinatorFee,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
      };

      // Validate with Zod
      const validated = PaymentSplitSchema.parse(paymentSplit);

      // Store payment split
      this.activePaymentSplits.set(validated.id, validated);

      // Initialize payment provider integrations
      await this.initializePaymentProviderSplits(validated);

      // Set up milestone monitoring if enabled
      if (request.milestoneBasedRelease) {
        await this.setupMilestoneMonitoring(validated.id, request.weddingId);
      }

      // Emit payment split created event
      this.emit('payment_split_created', {
        paymentSplitId: validated.id,
        weddingId: request.weddingId,
        totalAmount: request.totalAmount,
        vendorCount: request.vendorSplits.length,
      });

      return { success: true, paymentSplitId: validated.id };
    } catch (error) {
      console.error('Payment split creation failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error creating payment split',
      };
    }
  }

  /**
   * Processes payment authorization for wedding vendor splits
   */
  async authorizePayment(
    paymentSplitId: string,
    paymentMethodId: string,
  ): Promise<{
    success: boolean;
    authorizations?: Array<{
      vendorId: string;
      authorizationId: string;
      amount: number;
    }>;
    error?: string;
  }> {
    try {
      const paymentSplit = this.activePaymentSplits.get(paymentSplitId);
      if (!paymentSplit) {
        throw new Error(`Payment split not found: ${paymentSplitId}`);
      }

      const authorizations: Array<{
        vendorId: string;
        authorizationId: string;
        amount: number;
      }> = [];

      // Process each vendor split authorization
      for (const split of paymentSplit.splits) {
        try {
          const authResult = await this.authorizeVendorPayment({
            vendorId: split.vendorId,
            amount: split.amount,
            currency: paymentSplit.currency,
            paymentMethodId,
            description: `${split.description} - Wedding ${paymentSplit.weddingId}`,
            metadata: {
              paymentSplitId,
              vendorType: split.vendorType,
              weddingId: paymentSplit.weddingId,
            },
          });

          if (authResult.success) {
            split.status = 'authorized';
            split.paymentMethodId = paymentMethodId;
            authorizations.push({
              vendorId: split.vendorId,
              authorizationId: authResult.authorizationId!,
              amount: split.amount,
            });
          } else {
            split.status = 'failed';
            console.error(
              `Authorization failed for vendor ${split.vendorId}:`,
              authResult.error,
            );
          }
        } catch (vendorError) {
          split.status = 'failed';
          console.error(
            `Vendor authorization error for ${split.vendorId}:`,
            vendorError,
          );
        }
      }

      paymentSplit.updatedAt = new Date();
      paymentSplit.status = authorizations.length > 0 ? 'active' : 'cancelled';

      // Emit authorization events
      this.emitPaymentEvent('payment_authorized', paymentSplitId, {
        authorizations,
        successfulCount: authorizations.length,
        totalSplits: paymentSplit.splits.length,
      });

      return { success: true, authorizations };
    } catch (error) {
      console.error('Payment authorization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authorization failed',
      };
    }
  }

  /**
   * Releases escrowed payments based on wedding milestones
   */
  async processMilestonePaymentRelease(
    milestoneId: string,
    weddingId: string,
  ): Promise<{
    success: boolean;
    releasedPayments?: number;
    totalReleased?: number;
    error?: string;
  }> {
    try {
      // Find all payment splits for this wedding with milestone release conditions
      const weddingPaymentSplits = Array.from(
        this.activePaymentSplits.values(),
      ).filter((split) => split.weddingId === weddingId && split.escrowAccount);

      let totalReleasedAmount = 0;
      let releasedPaymentCount = 0;

      for (const paymentSplit of weddingPaymentSplits) {
        // Check if milestone conditions are met
        const milestoneCondition = paymentSplit.releaseConditions.find(
          (condition) =>
            condition.type === 'milestone' &&
            condition.description.includes(milestoneId),
        );

        if (milestoneCondition && milestoneCondition.status === 'met') {
          // Calculate release amount based on milestone percentage
          const milestone = await this.getWeddingMilestone(
            milestoneId,
            weddingId,
          );
          if (milestone) {
            const releaseAmount = Math.round(
              (paymentSplit.totalAmount * milestone.paymentPercentage) / 100,
            );

            // Process payment releases to vendors
            for (const split of paymentSplit.splits) {
              if (split.status === 'authorized') {
                const vendorReleaseAmount = Math.round(
                  (split.amount * milestone.paymentPercentage) / 100,
                );

                const releaseResult = await this.releaseVendorPayment({
                  vendorId: split.vendorId,
                  amount: vendorReleaseAmount,
                  currency: paymentSplit.currency,
                  escrowAccount: paymentSplit.escrowAccount!,
                  reason: `Milestone reached: ${milestone.name}`,
                  metadata: {
                    milestoneId,
                    paymentSplitId: paymentSplit.id,
                    weddingId,
                  },
                });

                if (releaseResult.success) {
                  totalReleasedAmount += vendorReleaseAmount;
                  releasedPaymentCount++;

                  // Update split status if fully released
                  const remainingAmount = split.amount - vendorReleaseAmount;
                  if (remainingAmount <= 0) {
                    split.status = 'captured';
                  }
                }
              }
            }
          }
        }
      }

      // Emit milestone payment release event
      this.emitPaymentEvent('milestone_reached', weddingId, {
        milestoneId,
        releasedPayments: releasedPaymentCount,
        totalReleased: totalReleasedAmount,
      });

      return {
        success: true,
        releasedPayments: releasedPaymentCount,
        totalReleased: totalReleasedAmount,
      };
    } catch (error) {
      console.error('Milestone payment release failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Milestone release failed',
      };
    }
  }

  /**
   * Handles wedding day emergency payment coordination
   */
  async handleWeddingDayEmergency(
    weddingId: string,
    emergency: {
      type:
        | 'vendor_no_show'
        | 'last_minute_change'
        | 'payment_dispute'
        | 'service_cancellation';
      vendorId: string;
      description: string;
      urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
      requestedAction:
        | 'hold_payment'
        | 'release_payment'
        | 'split_payment'
        | 'refund_payment';
    },
  ): Promise<{ success: boolean; actions?: string[]; error?: string }> {
    try {
      const actions: string[] = [];

      // Find all payment splits involving this vendor
      const affectedSplits = Array.from(
        this.activePaymentSplits.values(),
      ).filter(
        (split) =>
          split.weddingId === weddingId &&
          split.splits.some((s) => s.vendorId === emergency.vendorId),
      );

      for (const paymentSplit of affectedSplits) {
        const vendorSplit = paymentSplit.splits.find(
          (s) => s.vendorId === emergency.vendorId,
        );
        if (vendorSplit) {
          switch (emergency.requestedAction) {
            case 'hold_payment':
              if (vendorSplit.status === 'authorized') {
                await this.holdVendorPayment(
                  emergency.vendorId,
                  paymentSplit.id,
                );
                actions.push(
                  `Held payment of £${vendorSplit.amount} for vendor ${emergency.vendorId}`,
                );
              }
              break;

            case 'release_payment':
              if (
                vendorSplit.status === 'authorized' &&
                emergency.urgencyLevel === 'critical'
              ) {
                await this.releaseVendorPayment({
                  vendorId: emergency.vendorId,
                  amount: vendorSplit.amount,
                  currency: paymentSplit.currency,
                  escrowAccount: paymentSplit.escrowAccount!,
                  reason: `Wedding day emergency release: ${emergency.description}`,
                  metadata: { emergencyType: emergency.type, weddingId },
                });
                vendorSplit.status = 'captured';
                actions.push(
                  `Released payment of £${vendorSplit.amount} to vendor ${emergency.vendorId}`,
                );
              }
              break;

            case 'refund_payment':
              if (vendorSplit.status === 'captured') {
                await this.refundVendorPayment(
                  emergency.vendorId,
                  vendorSplit.amount,
                  emergency.description,
                );
                vendorSplit.status = 'refunded';
                actions.push(
                  `Refunded £${vendorSplit.amount} from vendor ${emergency.vendorId}`,
                );
              }
              break;
          }
        }
      }

      // Log emergency action
      this.emitPaymentEvent('payment_failed', weddingId, {
        emergencyType: emergency.type,
        vendorId: emergency.vendorId,
        actions,
        urgency: emergency.urgencyLevel,
      });

      return { success: true, actions };
    } catch (error) {
      console.error('Wedding day emergency handling failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Emergency handling failed',
      };
    }
  }

  // Private helper methods

  private calculateCoordinatorFee(totalAmount: number): {
    amount: number;
    percentage: number;
  } {
    // WedSync takes 3-7% coordination fee based on total amount
    let percentage = 3; // Base percentage

    if (totalAmount > 10000) percentage = 4;
    if (totalAmount > 25000) percentage = 5;
    if (totalAmount > 50000) percentage = 6;
    if (totalAmount > 100000) percentage = 7;

    return {
      percentage,
      amount: Math.round((totalAmount * percentage) / 100),
    };
  }

  private async createEscrowAccount(weddingId: string): Promise<string> {
    // Create escrow account with payment provider
    return `escrow_${weddingId}_${Date.now()}`;
  }

  private async createMilestoneReleaseConditions(
    weddingId: string,
  ): Promise<PaymentSplit['releaseConditions']> {
    const milestones = this.milestoneTemplates.get('traditional') || [];

    return milestones.map((milestone) => ({
      type: 'milestone' as const,
      description: `${milestone.name} (${milestone.paymentPercentage}% release)`,
      status: 'pending' as const,
      dueDate: milestone.scheduledDate,
    }));
  }

  private async initializePaymentProviderSplits(
    paymentSplit: PaymentSplit,
  ): Promise<void> {
    // Initialize splits with primary payment provider (Stripe)
    // This would connect to actual payment provider APIs
    console.log(
      `Initializing payment splits for ${paymentSplit.id} with ${paymentSplit.splits.length} vendors`,
    );
  }

  private async setupMilestoneMonitoring(
    paymentSplitId: string,
    weddingId: string,
  ): Promise<void> {
    // Set up monitoring for milestone achievement
    console.log(
      `Setting up milestone monitoring for payment split ${paymentSplitId}`,
    );
  }

  private async authorizeVendorPayment(request: {
    vendorId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    description: string;
    metadata: Record<string, any>;
  }): Promise<{ success: boolean; authorizationId?: string; error?: string }> {
    // Implement actual payment provider authorization
    return {
      success: true,
      authorizationId: `auth_${Date.now()}_${request.vendorId}`,
    };
  }

  private async releaseVendorPayment(request: {
    vendorId: string;
    amount: number;
    currency: string;
    escrowAccount: string;
    reason: string;
    metadata: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    // Implement actual payment release from escrow
    return { success: true };
  }

  private async holdVendorPayment(
    vendorId: string,
    paymentSplitId: string,
  ): Promise<void> {
    // Implement payment hold functionality
    console.log(
      `Holding payment for vendor ${vendorId} in split ${paymentSplitId}`,
    );
  }

  private async refundVendorPayment(
    vendorId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    // Implement refund functionality
    console.log(`Refunding £${amount} to vendor ${vendorId}: ${reason}`);
  }

  private async getWeddingMilestone(
    milestoneId: string,
    weddingId: string,
  ): Promise<WeddingMilestone | null> {
    // Fetch milestone from database
    const milestones = this.milestoneTemplates.get('traditional') || [];
    return milestones.find((m) => m.id === milestoneId) || null;
  }

  private initializeWeddingMilestoneTemplates(): void {
    // Initialize standard wedding milestone templates
    const traditionalMilestones: WeddingMilestone[] = [
      {
        id: 'booking_deposit',
        name: 'Booking Deposit',
        description: 'Initial booking confirmation',
        type: 'booking',
        scheduledDate: new Date(), // Would be set per wedding
        paymentPercentage: 25,
        requiredApprovals: [],
        dependencies: [],
        isWeddingDay: false,
        priority: 'high',
      },
      {
        id: 'contract_signed',
        name: 'Contract Signed',
        description: 'All vendor contracts executed',
        type: 'contract_signed',
        scheduledDate: new Date(),
        paymentPercentage: 25,
        requiredApprovals: [],
        dependencies: ['booking_deposit'],
        isWeddingDay: false,
        priority: 'high',
      },
      {
        id: 'final_payment',
        name: 'Wedding Day Service',
        description: 'Final payment upon service delivery',
        type: 'ceremony',
        scheduledDate: new Date(),
        paymentPercentage: 50,
        requiredApprovals: [],
        dependencies: ['contract_signed'],
        isWeddingDay: true,
        priority: 'critical',
      },
    ];

    this.milestoneTemplates.set('traditional', traditionalMilestones);
  }

  private setupPaymentEventHandlers(): void {
    this.on('payment_split_created', (data) => {
      console.log(
        `Payment split created for wedding ${data.weddingId}: £${data.totalAmount} across ${data.vendorCount} vendors`,
      );
    });

    this.on('milestone_reached', (data) => {
      console.log(
        `Milestone reached for wedding ${data.weddingId}: Released £${data.totalReleased} to ${data.releasedPayments} vendors`,
      );
    });
  }

  private emitPaymentEvent(
    type: PaymentEvent['type'],
    entityId: string,
    data: Record<string, any>,
  ): void {
    const event: PaymentEvent = {
      id: this.generateId('pe'),
      type,
      paymentSplitId: entityId,
      timestamp: new Date(),
      data,
      source: {
        system: 'wedsync_payment_coordination',
        endpoint: 'internal',
      },
    };

    this.emit('payment_event', event);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PaymentCoordinationService;
