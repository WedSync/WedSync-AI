/**
 * WS-245 Wedding Budget Optimizer - Financial Service Integration
 * Secure integrations with QuickBooks, Stripe, PayPal for expense tracking
 */

import { z } from 'zod';
import IntegrationServiceBase from './base/integration-service-base';
import type {
  FinancialServiceRequest,
  FinancialServiceResponse,
  FinancialTransaction,
  CategoryBreakdown,
  BudgetComparison,
  SavingsOpportunity,
  FinancialAccountConnection,
  PricingServiceConfig,
  ValidationResult,
  ServiceType,
  Currency,
  PricingConfidence,
} from '@/types/pricing';

// Financial service provider types
export enum FinancialProvider {
  QUICKBOOKS = 'quickbooks',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BANK_ACCOUNT = 'bank_account',
  OPEN_BANKING = 'open_banking',
}

export interface FinancialCredentials {
  readonly providerId: string;
  readonly provider: FinancialProvider;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly companyId?: string; // QuickBooks specific
  readonly accountId?: string; // Bank account specific
  readonly webhookSecret?: string;
  readonly expiresAt?: Date;
  readonly scopes?: string[];
}

export interface FinancialConnection {
  readonly connectionId: string;
  readonly organizationId: string;
  readonly provider: FinancialProvider;
  readonly status: 'active' | 'expired' | 'failed' | 'pending';
  readonly credentials: FinancialCredentials;
  readonly lastSyncAt: Date;
  readonly syncFrequency: 'realtime' | 'hourly' | 'daily';
  readonly categories: ServiceType[];
}

// Validation schemas
const financialServiceRequestSchema = z.object({
  organizationId: z.string().uuid(),
  accountConnections: z.array(
    z.object({
      accountId: z.string(),
      provider: z.nativeEnum(FinancialProvider),
      connectionStatus: z.enum(['active', 'expired', 'failed']),
      lastSyncAt: z.date(),
    }),
  ),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  categories: z.array(z.nativeEnum(ServiceType)).optional(),
});

const quickbooksResponseSchema = z.object({
  QueryResponse: z
    .object({
      Item: z
        .array(
          z.object({
            Id: z.string(),
            Name: z.string(),
            UnitPrice: z.number().optional(),
            QtyOnHand: z.number().optional(),
            Type: z.string(),
            IncomeAccountRef: z
              .object({
                value: z.string(),
                name: z.string().optional(),
              })
              .optional(),
            MetaData: z
              .object({
                CreateTime: z.string(),
                LastUpdatedTime: z.string(),
              })
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

const stripeResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      created: z.number(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional(),
      payment_method: z
        .object({
          type: z.string(),
        })
        .optional(),
      status: z.string(),
    }),
  ),
  has_more: z.boolean(),
});

/**
 * Financial Service Integration
 * Handles secure integrations with financial service providers
 */
export class FinancialServiceIntegration extends IntegrationServiceBase<
  FinancialServiceRequest,
  FinancialServiceResponse
> {
  private financialConnections = new Map<string, FinancialConnection>();

  constructor(
    config: PricingServiceConfig,
    private credentialsService: FinancialCredentialsService,
  ) {
    super(config);
  }

  protected validateRequest(
    request: FinancialServiceRequest,
  ): ValidationResult<FinancialServiceRequest> {
    try {
      const validated = financialServiceRequestSchema.parse(request);

      // Additional business validations
      if (validated.dateRange.start >= validated.dateRange.end) {
        return {
          isValid: false,
          errors: ['Start date must be before end date'],
        };
      }

      // Check date range is not too large (max 2 years)
      const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in ms
      const rangeMs =
        validated.dateRange.end.getTime() - validated.dateRange.start.getTime();
      if (rangeMs > maxRange) {
        return {
          isValid: false,
          errors: ['Date range cannot exceed 2 years'],
        };
      }

      return {
        isValid: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
      };
    }
  }

  protected async makeRequest(
    request: FinancialServiceRequest,
    requestId: string,
  ): Promise<unknown> {
    const results: any = {
      transactions: [],
      provider_data: {},
    };

    // Process each account connection in parallel
    const connectionPromises = request.accountConnections
      .filter((conn) => conn.connectionStatus === 'active')
      .map(async (connection) => {
        try {
          const providerData = await this.fetchProviderData(
            connection,
            request.dateRange,
            request.categories,
            requestId,
          );

          results.provider_data[connection.provider] = providerData;
          return providerData;
        } catch (error) {
          this.logger.error('Failed to fetch provider data', {
            requestId,
            provider: connection.provider,
            accountId: connection.accountId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

    await Promise.allSettled(connectionPromises);

    // Aggregate all transaction data
    Object.values(results.provider_data).forEach((providerData: any) => {
      if (providerData?.transactions) {
        results.transactions.push(...providerData.transactions);
      }
    });

    return results;
  }

  protected transformResponse(response: unknown): FinancialServiceResponse {
    const data = response as any;
    const transactions = this.transformTransactions(data.transactions || []);
    const categoryBreakdown = this.calculateCategoryBreakdown(transactions);
    const budgetComparison = this.calculateBudgetComparison(categoryBreakdown);
    const savingsOpportunities =
      this.identifySavingsOpportunities(categoryBreakdown);

    return {
      transactions,
      categoryBreakdown,
      budgetComparison,
      savingsOpportunities,
    };
  }

  /**
   * Fetch data from a specific financial provider
   */
  private async fetchProviderData(
    connection: FinancialAccountConnection,
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
    requestId: string,
  ): Promise<any> {
    switch (connection.provider) {
      case 'quickbooks':
        return this.fetchQuickBooksData(
          connection,
          dateRange,
          categories,
          requestId,
        );
      case 'stripe':
        return this.fetchStripeData(
          connection,
          dateRange,
          categories,
          requestId,
        );
      case 'paypal':
        return this.fetchPayPalData(
          connection,
          dateRange,
          categories,
          requestId,
        );
      case 'bank_account':
        return this.fetchBankData(connection, dateRange, categories, requestId);
      default:
        throw new Error(
          `Unsupported financial provider: ${connection.provider}`,
        );
    }
  }

  /**
   * Fetch QuickBooks transaction data
   */
  private async fetchQuickBooksData(
    connection: FinancialAccountConnection,
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
    requestId: string,
  ): Promise<any> {
    const credentials = await this.credentialsService.getCredentials(
      connection.accountId,
    );
    if (!credentials || !credentials.accessToken) {
      throw new Error('QuickBooks credentials not found');
    }

    // Refresh token if needed
    await this.ensureValidToken(credentials);

    const query = this.buildQuickBooksQuery(dateRange, categories);
    const encodedQuery = encodeURIComponent(query);

    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${credentials.companyId}/query?query=${encodedQuery}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
          'X-Request-ID': requestId,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`QuickBooks API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const validationResult = this.validateResponseStructure(
      data,
      quickbooksResponseSchema,
    );

    if (!validationResult.isValid) {
      throw new Error(
        `Invalid QuickBooks response: ${validationResult.errors?.join(', ')}`,
      );
    }

    return {
      transactions: this.transformQuickBooksData(data),
      provider: 'quickbooks',
      account_id: connection.accountId,
    };
  }

  /**
   * Fetch Stripe transaction data
   */
  private async fetchStripeData(
    connection: FinancialAccountConnection,
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
    requestId: string,
  ): Promise<any> {
    const credentials = await this.credentialsService.getCredentials(
      connection.accountId,
    );
    if (!credentials || !credentials.accessToken) {
      throw new Error('Stripe credentials not found');
    }

    const params = new URLSearchParams({
      created: JSON.stringify({
        gte: Math.floor(dateRange.start.getTime() / 1000),
        lte: Math.floor(dateRange.end.getTime() / 1000),
      }),
      limit: '100',
      expand: ['data.payment_method'],
    });

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents?${params}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Stripe-Version': '2023-10-16',
          'X-Request-ID': requestId,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Stripe API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const validationResult = this.validateResponseStructure(
      data,
      stripeResponseSchema,
    );

    if (!validationResult.isValid) {
      throw new Error(
        `Invalid Stripe response: ${validationResult.errors?.join(', ')}`,
      );
    }

    return {
      transactions: this.transformStripeData(data),
      provider: 'stripe',
      account_id: connection.accountId,
    };
  }

  /**
   * Fetch PayPal transaction data
   */
  private async fetchPayPalData(
    connection: FinancialAccountConnection,
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
    requestId: string,
  ): Promise<any> {
    const credentials = await this.credentialsService.getCredentials(
      connection.accountId,
    );
    if (!credentials || !credentials.accessToken) {
      throw new Error('PayPal credentials not found');
    }

    // PayPal uses OAuth 2.0, ensure token is valid
    await this.ensureValidToken(credentials);

    const params = new URLSearchParams({
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString(),
      fields: 'all',
      page_size: '500',
    });

    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v1/reporting/transactions?${params}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': requestId,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`PayPal API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      transactions: this.transformPayPalData(data),
      provider: 'paypal',
      account_id: connection.accountId,
    };
  }

  /**
   * Fetch bank account data (Open Banking)
   */
  private async fetchBankData(
    connection: FinancialAccountConnection,
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
    requestId: string,
  ): Promise<any> {
    // This would integrate with Open Banking APIs (PSD2)
    // Implementation would depend on specific bank/aggregator
    this.logger.info('Open Banking integration not fully implemented', {
      requestId,
      accountId: connection.accountId,
    });

    return {
      transactions: [],
      provider: 'bank_account',
      account_id: connection.accountId,
    };
  }

  /**
   * Build QuickBooks SQL query
   */
  private buildQuickBooksQuery(
    dateRange: { start: Date; end: Date },
    categories: ServiceType[] | undefined,
  ): string {
    let query = 'SELECT * FROM Item WHERE Active = true';

    // Add date range filter
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];
    query += ` AND MetaData.CreateTime >= '${startDate}' AND MetaData.CreateTime <= '${endDate}'`;

    // Add category filter if specified
    if (categories && categories.length > 0) {
      const categoryFilter = categories.map((cat) => `'${cat}'`).join(', ');
      query += ` AND Type IN (${categoryFilter})`;
    }

    query += ' ORDER BY MetaData.CreateTime DESC MAXRESULTS 1000';

    return query;
  }

  /**
   * Transform generic transactions to standard format
   */
  private transformTransactions(transactions: any[]): FinancialTransaction[] {
    return transactions.map((transaction) => ({
      transactionId: transaction.id || transaction.transactionId,
      amount: Math.round((transaction.amount || 0) * 100), // Convert to pence
      currency: (transaction.currency || 'GBP').toUpperCase() as Currency,
      date: new Date(transaction.date || transaction.created_time),
      vendorName:
        transaction.vendorName || transaction.description || 'Unknown Vendor',
      category: this.categorizeTransaction(transaction),
      description: transaction.description || transaction.name || '',
      paymentMethod: transaction.paymentMethod || transaction.type || 'unknown',
      status: transaction.status || 'completed',
    }));
  }

  /**
   * Transform QuickBooks data to standard format
   */
  private transformQuickBooksData(data: any): any[] {
    const items = data.QueryResponse?.Item || [];

    return items.map((item: any) => ({
      id: item.Id,
      amount: item.UnitPrice || 0,
      date: item.MetaData?.CreateTime || new Date().toISOString(),
      description: item.Name,
      vendorName: 'QuickBooks Entry',
      type: item.Type,
      category: this.mapQuickBooksCategory(item.Type),
      status: 'completed',
    }));
  }

  /**
   * Transform Stripe data to standard format
   */
  private transformStripeData(data: any): any[] {
    return data.data.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount / 100, // Stripe amounts are in cents
      currency: payment.currency.toUpperCase(),
      date: new Date(payment.created * 1000), // Stripe timestamps are Unix
      description: payment.description || 'Stripe Payment',
      vendorName: 'Stripe Payment',
      paymentMethod: payment.payment_method?.type || 'card',
      status: payment.status,
      metadata: payment.metadata,
    }));
  }

  /**
   * Transform PayPal data to standard format
   */
  private transformPayPalData(data: any): any[] {
    const transactions = data.transaction_details || [];

    return transactions.map((transaction: any) => ({
      id: transaction.transaction_info?.transaction_id,
      amount: parseFloat(
        transaction.transaction_info?.transaction_amount?.value || '0',
      ),
      currency:
        transaction.transaction_info?.transaction_amount?.currency_code ||
        'GBP',
      date: new Date(transaction.transaction_info?.transaction_initiation_date),
      description:
        transaction.transaction_info?.transaction_subject ||
        'PayPal Transaction',
      vendorName:
        transaction.payer_info?.payer_name?.alternate_full_name ||
        'PayPal Payment',
      paymentMethod: 'paypal',
      status: transaction.transaction_info?.transaction_status || 'completed',
    }));
  }

  /**
   * Categorize transaction into wedding service types
   */
  private categorizeTransaction(transaction: any): ServiceType {
    const description = (
      transaction.description ||
      transaction.name ||
      ''
    ).toLowerCase();
    const vendorName = (transaction.vendorName || '').toLowerCase();
    const text = `${description} ${vendorName}`;

    // Wedding category keywords
    const categoryKeywords: Record<ServiceType, string[]> = {
      [ServiceType.VENUE]: [
        'venue',
        'hall',
        'manor',
        'hotel',
        'castle',
        'barn',
      ],
      [ServiceType.PHOTOGRAPHY]: [
        'photo',
        'photographer',
        'picture',
        'shoot',
        'image',
      ],
      [ServiceType.CATERING]: [
        'catering',
        'food',
        'menu',
        'chef',
        'meal',
        'dining',
      ],
      [ServiceType.FLOWERS]: [
        'flower',
        'floral',
        'bouquet',
        'arrangement',
        'florist',
      ],
      [ServiceType.ENTERTAINMENT]: [
        'band',
        'dj',
        'music',
        'entertainment',
        'singer',
        'musician',
      ],
      [ServiceType.DRESS]: [
        'dress',
        'gown',
        'suit',
        'attire',
        'bridal',
        'tuxedo',
      ],
      [ServiceType.CAKE]: ['cake', 'baker', 'bakery', 'dessert', 'sweet'],
      [ServiceType.TRANSPORT]: [
        'car',
        'limo',
        'transport',
        'taxi',
        'vehicle',
        'chauffeur',
      ],
      [ServiceType.STATIONERY]: ['stationery', 'invitation', 'card', 'print'],
      [ServiceType.OTHER]: [],
    };

    // Find matching category
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category as ServiceType;
      }
    }

    return ServiceType.OTHER;
  }

  /**
   * Map QuickBooks categories to wedding service types
   */
  private mapQuickBooksCategory(qbType: string): ServiceType {
    const categoryMap: Record<string, ServiceType> = {
      Service: ServiceType.OTHER,
      Photography: ServiceType.PHOTOGRAPHY,
      Catering: ServiceType.CATERING,
      Venue: ServiceType.VENUE,
      Floral: ServiceType.FLOWERS,
      Entertainment: ServiceType.ENTERTAINMENT,
      Attire: ServiceType.DRESS,
    };

    return categoryMap[qbType] || ServiceType.OTHER;
  }

  /**
   * Calculate category breakdown from transactions
   */
  private calculateCategoryBreakdown(
    transactions: FinancialTransaction[],
  ): CategoryBreakdown[] {
    const categoryTotals = new Map<
      ServiceType,
      {
        total: number;
        count: number;
        transactions: FinancialTransaction[];
      }
    >();

    // Group transactions by category
    transactions.forEach((transaction) => {
      const existing = categoryTotals.get(transaction.category) || {
        total: 0,
        count: 0,
        transactions: [],
      };

      existing.total += transaction.amount;
      existing.count += 1;
      existing.transactions.push(transaction);
      categoryTotals.set(transaction.category, existing);
    });

    // Convert to CategoryBreakdown format
    return Array.from(categoryTotals.entries()).map(([category, data]) => ({
      category,
      totalSpent: data.total,
      transactionCount: data.count,
      averageAmount: Math.round(data.total / data.count),
      // budgetAllocated and remainingBudget would come from budget data
    }));
  }

  /**
   * Calculate budget comparison
   */
  private calculateBudgetComparison(
    categoryBreakdown: CategoryBreakdown[],
  ): BudgetComparison {
    const totalSpent = categoryBreakdown.reduce(
      (sum, cat) => sum + cat.totalSpent,
      0,
    );

    return {
      totalBudget: 0, // Would be fetched from budget data
      totalSpent,
      totalPending: 0, // Would be calculated from pending transactions
      remainingBudget: 0, // totalBudget - totalSpent
      categories: categoryBreakdown,
    };
  }

  /**
   * Identify savings opportunities
   */
  private identifySavingsOpportunities(
    categoryBreakdown: CategoryBreakdown[],
  ): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];

    categoryBreakdown.forEach((category) => {
      // Example: Identify categories with high spending
      if (category.totalSpent > 500000) {
        // £5000 in pence
        const recommendedSpend = Math.round(category.totalSpent * 0.85); // 15% reduction
        opportunities.push({
          category: category.category,
          currentSpend: category.totalSpent,
          recommendedSpend,
          potentialSavings: category.totalSpent - recommendedSpend,
          confidence: PricingConfidence.MEDIUM,
          actionRequired: `Review ${category.category} expenses for cost reduction opportunities`,
        });
      }
    });

    return opportunities;
  }

  /**
   * Ensure financial service token is valid
   */
  private async ensureValidToken(
    credentials: FinancialCredentials,
  ): Promise<void> {
    if (!credentials.expiresAt || credentials.expiresAt > new Date()) {
      return; // Token is still valid
    }

    if (!credentials.refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }

    // Refresh the token
    await this.credentialsService.refreshToken(credentials.providerId);
  }

  /**
   * Connect a new financial service
   */
  async connectFinancialService(
    organizationId: string,
    provider: FinancialProvider,
    credentials: FinancialCredentials,
  ): Promise<boolean> {
    try {
      const connection = await this.credentialsService.createConnection(
        organizationId,
        provider,
        credentials,
      );

      if (connection) {
        this.financialConnections.set(connection.connectionId, connection);
        this.logger.info('Financial service connected successfully', {
          organizationId,
          provider,
          connectionId: connection.connectionId,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to connect financial service', {
        organizationId,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Financial Credentials Service Interface
interface FinancialCredentialsService {
  getCredentials(accountId: string): Promise<FinancialCredentials | null>;
  createConnection(
    organizationId: string,
    provider: FinancialProvider,
    credentials: FinancialCredentials,
  ): Promise<FinancialConnection | null>;
  refreshToken(providerId: string): Promise<void>;
}

// Configuration for financial service providers
export const FINANCIAL_SERVICE_CONFIGS: Record<
  FinancialProvider,
  PricingServiceConfig
> = {
  [FinancialProvider.QUICKBOOKS]: {
    baseUrl:
      process.env.QUICKBOOKS_SANDBOX_URL ||
      'https://sandbox-quickbooks.api.intuit.com',
    apiKey: process.env.QUICKBOOKS_CLIENT_ID || '',
    timeoutMs: 15000,
    retryAttempts: 2,
    retryDelayMs: 2000,
    rateLimit: {
      requestsPerMinute: 300, // QuickBooks has higher limits
      requestsPerHour: 5000,
    },
    cache: {
      ttlMs: 30 * 60 * 1000, // 30 minutes
      maxSize: 500,
    },
  },
  [FinancialProvider.STRIPE]: {
    baseUrl: 'https://api.stripe.com/v1',
    apiKey: process.env.STRIPE_SECRET_KEY || '',
    timeoutMs: 10000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
    cache: {
      ttlMs: 10 * 60 * 1000, // 10 minutes
      maxSize: 1000,
    },
  },
  [FinancialProvider.PAYPAL]: {
    baseUrl: 'https://api-m.sandbox.paypal.com/v1',
    apiKey: process.env.PAYPAL_CLIENT_ID || '',
    timeoutMs: 12000,
    retryAttempts: 2,
    retryDelayMs: 1500,
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerHour: 500,
    },
    cache: {
      ttlMs: 20 * 60 * 1000, // 20 minutes
      maxSize: 300,
    },
  },
  [FinancialProvider.BANK_ACCOUNT]: {
    baseUrl:
      process.env.OPEN_BANKING_API_URL || 'https://api.openbanking.org.uk',
    apiKey: process.env.OPEN_BANKING_CLIENT_ID || '',
    timeoutMs: 20000,
    retryAttempts: 1, // Conservative for banking APIs
    retryDelayMs: 5000,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
    },
    cache: {
      ttlMs: 60 * 60 * 1000, // 1 hour
      maxSize: 100,
    },
  },
  [FinancialProvider.OPEN_BANKING]: {
    baseUrl:
      process.env.OPEN_BANKING_API_URL || 'https://api.openbanking.org.uk',
    apiKey: process.env.OPEN_BANKING_CLIENT_ID || '',
    timeoutMs: 20000,
    retryAttempts: 1,
    retryDelayMs: 5000,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
    },
    cache: {
      ttlMs: 60 * 60 * 1000, // 1 hour
      maxSize: 100,
    },
  },
};

export default FinancialServiceIntegration;
