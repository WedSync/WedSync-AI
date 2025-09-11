// Payment Gateway Orchestra for WedSync Marketplace
// Orchestrates multiple payment providers for wedding vendor transactions

export interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'square' | 'authorize_net';
  supported_currencies: string[];
  processing_fee: number;
  setup_fee: number;
  monthly_fee: number;
  active: boolean;
}

export interface PaymentTransaction {
  id: string;
  provider_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  vendor_id: string;
  customer_id: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  processed_at?: string;
}

export interface PaymentOrchestrationRule {
  priority: number;
  condition: string;
  provider_id: string;
  description: string;
}

export class PaymentGatewayOrchestra {
  private providers: Map<string, PaymentProvider> = new Map();
  private transactions: Map<string, PaymentTransaction> = new Map();
  private orchestrationRules: PaymentOrchestrationRule[] = [];

  /**
   * Add payment provider to orchestra
   */
  addProvider(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`Added payment provider: ${provider.name}`);
  }

  /**
   * Process wedding vendor payment
   */
  async processPayment(paymentRequest: {
    amount: number;
    currency: string;
    vendor_id: string;
    customer_id: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentTransaction> {
    // Select optimal payment provider
    const providerId = await this.selectOptimalProvider(paymentRequest);
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Payment provider not found: ${providerId}`);
    }

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction: PaymentTransaction = {
      id: transactionId,
      provider_id: providerId,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      status: 'pending',
      vendor_id: paymentRequest.vendor_id,
      customer_id: paymentRequest.customer_id,
      description: paymentRequest.description,
      metadata: paymentRequest.metadata || {},
      created_at: new Date().toISOString(),
    };

    this.transactions.set(transactionId, transaction);

    // Simulate payment processing
    setTimeout(async () => {
      await this.finalizePayment(transactionId);
    }, 1000);

    return transaction;
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    transactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Process refund
   */
  async processRefund(
    transactionId: string,
    amount?: number,
  ): Promise<{
    success: boolean;
    refund_id: string;
    amount: number;
    fee: number;
  }> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const refundAmount = amount || transaction.amount;
    const refundId = `ref_${Date.now()}`;

    // Update transaction status
    transaction.status = 'refunded';
    this.transactions.set(transactionId, transaction);

    return {
      success: true,
      refund_id: refundId,
      amount: refundAmount,
      fee: refundAmount * 0.029, // Standard processing fee
    };
  }

  /**
   * Get payment analytics for wedding vendors
   */
  async getPaymentAnalytics(vendorId: string): Promise<{
    total_revenue: number;
    total_transactions: number;
    average_transaction_size: number;
    processing_fees_paid: number;
    refund_rate: number;
    popular_payment_methods: Array<{ method: string; percentage: number }>;
  }> {
    const vendorTransactions = Array.from(this.transactions.values()).filter(
      (t) => t.vendor_id === vendorId && t.status === 'completed',
    );

    const totalRevenue = vendorTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const totalTransactions = vendorTransactions.length;
    const averageTransactionSize =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const processingFees = totalRevenue * 0.029;

    const refundedTransactions = Array.from(this.transactions.values()).filter(
      (t) => t.vendor_id === vendorId && t.status === 'refunded',
    );
    const refundRate =
      totalTransactions > 0
        ? refundedTransactions.length / totalTransactions
        : 0;

    return {
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      average_transaction_size: averageTransactionSize,
      processing_fees_paid: processingFees,
      refund_rate: refundRate,
      popular_payment_methods: [
        { method: 'Credit Card', percentage: 0.65 },
        { method: 'Debit Card', percentage: 0.25 },
        { method: 'PayPal', percentage: 0.08 },
        { method: 'Bank Transfer', percentage: 0.02 },
      ],
    };
  }

  /**
   * Set up payment orchestration rules
   */
  addOrchestrationRule(rule: PaymentOrchestrationRule): void {
    this.orchestrationRules.push(rule);
    this.orchestrationRules.sort((a, b) => a.priority - b.priority);
    console.log(`Added orchestration rule: ${rule.description}`);
  }

  /**
   * Select optimal payment provider based on rules
   */
  private async selectOptimalProvider(paymentRequest: any): Promise<string> {
    // Default to first available provider
    const availableProviders = Array.from(this.providers.values()).filter(
      (p) => p.active,
    );

    if (availableProviders.length === 0) {
      throw new Error('No active payment providers available');
    }

    // Apply orchestration rules
    for (const rule of this.orchestrationRules) {
      if (this.evaluateRule(rule.condition, paymentRequest)) {
        const provider = this.providers.get(rule.provider_id);
        if (provider && provider.active) {
          return rule.provider_id;
        }
      }
    }

    // Default to lowest fee provider
    const optimalProvider = availableProviders.reduce((best, current) => {
      return current.processing_fee < best.processing_fee ? current : best;
    });

    return optimalProvider.id;
  }

  /**
   * Finalize payment processing
   */
  private async finalizePayment(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;

    transaction.status = success ? 'completed' : 'failed';
    transaction.processed_at = new Date().toISOString();

    this.transactions.set(transactionId, transaction);

    console.log(`Payment ${transactionId} ${success ? 'completed' : 'failed'}`);
  }

  /**
   * Evaluate orchestration rule condition
   */
  private evaluateRule(condition: string, paymentRequest: any): boolean {
    // Simple rule evaluation (in production would use a proper rule engine)
    if (condition.includes('amount >')) {
      const threshold = parseFloat(condition.split('amount >')[1].trim());
      return paymentRequest.amount > threshold;
    }

    if (condition.includes('currency ==')) {
      const currency = condition
        .split('currency ==')[1]
        .trim()
        .replace(/['"]/g, '');
      return paymentRequest.currency === currency;
    }

    return false;
  }

  /**
   * Create default payment providers
   */
  createDefaultProviders(): void {
    const defaultProviders: PaymentProvider[] = [
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'stripe',
        supported_currencies: ['GBP', 'USD', 'EUR'],
        processing_fee: 0.029,
        setup_fee: 0,
        monthly_fee: 0,
        active: true,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        type: 'paypal',
        supported_currencies: ['GBP', 'USD', 'EUR'],
        processing_fee: 0.034,
        setup_fee: 0,
        monthly_fee: 0,
        active: true,
      },
    ];

    defaultProviders.forEach((provider) => this.addProvider(provider));

    // Add default orchestration rules
    this.addOrchestrationRule({
      priority: 1,
      condition: 'amount > 1000',
      provider_id: 'stripe',
      description: 'Use Stripe for high-value transactions',
    });
  }
}

export default PaymentGatewayOrchestra;
