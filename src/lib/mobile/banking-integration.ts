/**
 * Mobile Banking Integration System
 * Team D - Round 2 WS-163 Implementation
 *
 * Provides secure integration with mobile banking apps for automatic transaction
 * categorization and expense tracking for wedding budgets.
 */

import { BudgetItem, BudgetCategory } from './advanced-budget-system';
import { weddingSync } from './background-sync';

// ==================== TYPES AND INTERFACES ====================

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  routingNumber?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  lastSyncDate: string;
  permissions: BankPermissions;
  metadata: BankMetadata;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  category?: string;
  subcategory?: string;
  date: string;
  type: TransactionType;
  status: TransactionStatus;
  metadata: TransactionMetadata;
  weddingRelated: boolean;
  confidence: number;
  suggestedCategory?: string;
  manuallyVerified: boolean;
  budgetItemId?: string;
}

export interface BankPermissions {
  readTransactions: boolean;
  readBalance: boolean;
  readAccountInfo: boolean;
  categorizeTransactions: boolean;
  exportData: boolean;
}

export interface BankMetadata {
  logoUrl?: string;
  primaryColor?: string;
  supportedFeatures: string[];
  apiVersion: string;
  lastUpdated: string;
}

export interface TransactionMetadata {
  merchantCategory: string;
  location?: GeoLocation;
  paymentMethod?: string;
  originalDescription: string;
  tags: string[];
  isRecurring: boolean;
  recurringGroup?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface BankingProvider {
  name: string;
  id: string;
  supported: boolean;
  features: BankingFeature[];
  connectionType: ConnectionType;
  setupInstructions: string[];
  requirements: string[];
}

export interface BankSyncResult {
  accountId: string;
  newTransactions: number;
  categorizedTransactions: number;
  weddingTransactions: number;
  errors: BankSyncError[];
  lastSyncDate: string;
  nextSyncDate: string;
}

export interface BankSyncError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  recoverable: boolean;
  retryAfter?: number;
}

export interface WeddingCategoryMapping {
  bankCategory: string;
  weddingCategory: string;
  keywords: string[];
  merchantPatterns: string[];
  confidenceThreshold: number;
  autoApprove: boolean;
}

export interface AutoCategorizationRule {
  id: string;
  name: string;
  conditions: CategoryCondition[];
  action: CategoryAction;
  priority: number;
  isActive: boolean;
  accuracy: number;
  lastUsed?: string;
}

export interface CategoryCondition {
  field: 'description' | 'merchant' | 'amount' | 'category' | 'location';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
  caseSensitive?: boolean;
}

export interface CategoryAction {
  type:
    | 'assign_category'
    | 'flag_for_review'
    | 'auto_create_expense'
    | 'ignore';
  categoryId?: string;
  confidence: number;
  createBudgetItem?: boolean;
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
}

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  TRANSFER = 'transfer',
  FEE = 'fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum BankingFeature {
  TRANSACTION_SYNC = 'transaction_sync',
  BALANCE_CHECK = 'balance_check',
  AUTOMATIC_CATEGORIZATION = 'automatic_categorization',
  REAL_TIME_NOTIFICATIONS = 'real_time_notifications',
  EXPORT_DATA = 'export_data',
  RECURRING_DETECTION = 'recurring_detection',
}

export enum ConnectionType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  SCREEN_SCRAPING = 'screen_scraping',
  MANUAL_UPLOAD = 'manual_upload',
}

// ==================== MOBILE BANKING INTEGRATION MANAGER ====================

export class MobileBankingIntegrationManager {
  private static instance: MobileBankingIntegrationManager;
  private connectedAccounts: Map<string, BankAccount> = new Map();
  private syncScheduler: BankSyncScheduler;
  private categoryEngine: AutoCategorizationEngine;
  private securityManager: BankingSecurityManager;
  private providers: Map<string, BankingProvider> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    this.syncScheduler = new BankSyncScheduler();
    this.categoryEngine = new AutoCategorizationEngine();
    this.securityManager = new BankingSecurityManager();
    this.initializeSupportedProviders();
  }

  public static getInstance(): MobileBankingIntegrationManager {
    if (!MobileBankingIntegrationManager.instance) {
      MobileBankingIntegrationManager.instance =
        new MobileBankingIntegrationManager();
    }
    return MobileBankingIntegrationManager.instance;
  }

  // ==================== INITIALIZATION ====================

  private initializeSupportedProviders(): void {
    // Major US banks and financial institutions
    const providers: BankingProvider[] = [
      {
        name: 'Chase Bank',
        id: 'chase',
        supported: true,
        features: [
          BankingFeature.TRANSACTION_SYNC,
          BankingFeature.BALANCE_CHECK,
          BankingFeature.AUTOMATIC_CATEGORIZATION,
        ],
        connectionType: ConnectionType.OAUTH,
        setupInstructions: [
          'Open Chase mobile app',
          'Enable API access in settings',
          'Authorize WedSync connection',
        ],
        requirements: ['Chase mobile app installed', 'Online banking enabled'],
      },
      {
        name: 'Bank of America',
        id: 'bofa',
        supported: true,
        features: [
          BankingFeature.TRANSACTION_SYNC,
          BankingFeature.BALANCE_CHECK,
        ],
        connectionType: ConnectionType.OAUTH,
        setupInstructions: [
          'Log into BofA online',
          'Navigate to API connections',
          'Add WedSync as authorized app',
        ],
        requirements: ['Online banking account', 'Mobile app installed'],
      },
      {
        name: 'Wells Fargo',
        id: 'wells_fargo',
        supported: true,
        features: [
          BankingFeature.TRANSACTION_SYNC,
          BankingFeature.AUTOMATIC_CATEGORIZATION,
        ],
        connectionType: ConnectionType.OAUTH,
        setupInstructions: [
          'Open Wells Fargo app',
          'Go to Account Services',
          'Enable third-party access',
        ],
        requirements: ['Wells Fargo mobile app', 'Online banking access'],
      },
      {
        name: 'Capital One',
        id: 'capital_one',
        supported: true,
        features: [
          BankingFeature.TRANSACTION_SYNC,
          BankingFeature.REAL_TIME_NOTIFICATIONS,
        ],
        connectionType: ConnectionType.OAUTH,
        setupInstructions: [
          'Log into Capital One',
          'Visit API access settings',
          'Authorize WedSync',
        ],
        requirements: ['Capital One account', 'Mobile banking enabled'],
      },
      {
        name: 'American Express',
        id: 'amex',
        supported: true,
        features: [BankingFeature.TRANSACTION_SYNC, BankingFeature.EXPORT_DATA],
        connectionType: ConnectionType.OAUTH,
        setupInstructions: [
          'Open Amex app',
          'Go to Account Services',
          'Enable API access',
        ],
        requirements: ['American Express card', 'Online account'],
      },
    ];

    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
    });

    this.isInitialized = true;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.securityManager.initialize();
      await this.categoryEngine.initialize();
      await this.syncScheduler.initialize();
      await this.loadConnectedAccounts();

      this.isInitialized = true;
      console.log('[Banking] Integration manager initialized');
    } catch (error) {
      console.error('[Banking] Failed to initialize:', error);
      throw error;
    }
  }

  // ==================== ACCOUNT CONNECTION ====================

  public async connectBankAccount(
    providerId: string,
    credentials: any,
  ): Promise<BankAccount> {
    if (!this.isInitialized) await this.initialize();

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unsupported banking provider: ${providerId}`);
    }

    try {
      // Validate credentials securely
      const validatedCredentials =
        await this.securityManager.validateCredentials(providerId, credentials);

      // Establish connection based on provider type
      const connection = await this.establishConnection(
        provider,
        validatedCredentials,
      );

      // Fetch account information
      const accountInfo = await this.fetchAccountInfo(connection);

      // Create bank account record
      const bankAccount: BankAccount = {
        id: `bank_${Date.now()}_${providerId}`,
        bankName: provider.name,
        accountType: accountInfo.type,
        accountNumber: this.maskAccountNumber(accountInfo.accountNumber),
        routingNumber: accountInfo.routingNumber,
        currency: accountInfo.currency || 'USD',
        balance: accountInfo.balance,
        isActive: true,
        lastSyncDate: new Date().toISOString(),
        permissions: {
          readTransactions: true,
          readBalance: true,
          readAccountInfo: true,
          categorizeTransactions: true,
          exportData: true,
        },
        metadata: {
          logoUrl: provider.logoUrl,
          primaryColor: provider.primaryColor,
          supportedFeatures: provider.features.map((f) => f.toString()),
          apiVersion: '1.0',
          lastUpdated: new Date().toISOString(),
        },
      };

      // Store connection securely
      await this.securityManager.storeConnection(bankAccount.id, connection);

      // Add to connected accounts
      this.connectedAccounts.set(bankAccount.id, bankAccount);

      // Schedule initial sync
      await this.syncScheduler.scheduleSync(bankAccount.id);

      // Perform initial transaction sync
      await this.performInitialSync(bankAccount.id);

      console.log(`[Banking] Connected to ${provider.name} successfully`);
      return bankAccount;
    } catch (error) {
      console.error(`[Banking] Failed to connect to ${provider.name}:`, error);
      throw error;
    }
  }

  public async disconnectBankAccount(accountId: string): Promise<void> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    try {
      // Revoke API access
      await this.securityManager.revokeConnection(accountId);

      // Cancel scheduled syncs
      this.syncScheduler.cancelSync(accountId);

      // Remove from connected accounts
      this.connectedAccounts.delete(accountId);

      console.log(`[Banking] Disconnected from ${account.bankName}`);
    } catch (error) {
      console.error('[Banking] Failed to disconnect account:', error);
      throw error;
    }
  }

  // ==================== TRANSACTION SYNCHRONIZATION ====================

  public async syncTransactions(accountId: string): Promise<BankSyncResult> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    try {
      console.log(`[Banking] Starting sync for ${account.bankName}...`);

      // Get connection
      const connection = await this.securityManager.getConnection(accountId);

      // Fetch new transactions
      const transactions = await this.fetchTransactions(
        connection,
        account.lastSyncDate,
      );

      // Categorize transactions
      const categorizedTransactions =
        await this.categorizeTransactions(transactions);

      // Filter wedding-related transactions
      const weddingTransactions = categorizedTransactions.filter(
        (t) => t.weddingRelated,
      );

      // Create budget items for wedding transactions
      await this.createBudgetItemsFromTransactions(weddingTransactions);

      // Update last sync date
      account.lastSyncDate = new Date().toISOString();
      this.connectedAccounts.set(accountId, account);

      const result: BankSyncResult = {
        accountId,
        newTransactions: transactions.length,
        categorizedTransactions: categorizedTransactions.length,
        weddingTransactions: weddingTransactions.length,
        errors: [],
        lastSyncDate: account.lastSyncDate,
        nextSyncDate: this.syncScheduler.getNextSyncDate(accountId),
      };

      console.log(
        `[Banking] Sync completed: ${result.newTransactions} new, ${result.weddingTransactions} wedding-related`,
      );
      return result;
    } catch (error) {
      console.error(`[Banking] Sync failed for ${account.bankName}:`, error);
      throw error;
    }
  }

  private async categorizeTransactions(
    transactions: BankTransaction[],
  ): Promise<BankTransaction[]> {
    const categorized: BankTransaction[] = [];

    for (const transaction of transactions) {
      const categorizedTransaction =
        await this.categoryEngine.categorizeTransaction(transaction);
      categorized.push(categorizedTransaction);
    }

    return categorized;
  }

  private async createBudgetItemsFromTransactions(
    transactions: BankTransaction[],
  ): Promise<void> {
    for (const transaction of transactions) {
      if (transaction.weddingRelated && transaction.confidence > 0.8) {
        try {
          const budgetItem: Partial<BudgetItem> = {
            name: transaction.merchantName || transaction.description,
            description: `Auto-imported: ${transaction.description}`,
            actual_cost: Math.abs(transaction.amount),
            status: 'completed' as any,
            payment_status: 'fully_paid' as any,
            notes: `Imported from ${transaction.id}`,
          };

          // Find appropriate category or create default
          const categoryId = transaction.suggestedCategory || 'miscellaneous';

          // Sync with budget system
          weddingSync.syncExpenseCreate(
            'current_wedding_id', // This would be dynamic in real app
            'current_user_id', // This would be dynamic in real app
            {
              ...budgetItem,
              category_id: categoryId,
              date: transaction.date,
              bank_transaction_id: transaction.id,
            },
          );

          // Link transaction to budget item
          transaction.budgetItemId = `budget_item_${Date.now()}`;
        } catch (error) {
          console.error(
            '[Banking] Failed to create budget item for transaction:',
            transaction.id,
            error,
          );
        }
      }
    }
  }

  // ==================== BANKING PROVIDER INTEGRATION ====================

  private async establishConnection(
    provider: BankingProvider,
    credentials: any,
  ): Promise<any> {
    switch (provider.connectionType) {
      case ConnectionType.OAUTH:
        return await this.establishOAuthConnection(provider, credentials);
      case ConnectionType.API_KEY:
        return await this.establishAPIKeyConnection(provider, credentials);
      default:
        throw new Error(
          `Unsupported connection type: ${provider.connectionType}`,
        );
    }
  }

  private async establishOAuthConnection(
    provider: BankingProvider,
    credentials: any,
  ): Promise<any> {
    // Simulate OAuth flow - in reality, this would use proper OAuth libraries
    const oauthUrl = `https://api.${provider.id}.com/oauth/authorize`;
    const params = {
      client_id: process.env.BANKING_CLIENT_ID,
      redirect_uri: `${process.env.BASE_URL}/banking/callback`,
      scope: 'read_transactions read_balance',
      response_type: 'code',
    };

    // This would open browser/webview for user authorization
    console.log(`[Banking] Initiating OAuth flow for ${provider.name}`);

    // Return mock connection for demo
    return {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: Date.now() + 3600 * 1000, // 1 hour
      providerId: provider.id,
    };
  }

  private async establishAPIKeyConnection(
    provider: BankingProvider,
    credentials: any,
  ): Promise<any> {
    // Validate API key format
    if (!credentials.apiKey || credentials.apiKey.length < 20) {
      throw new Error('Invalid API key format');
    }

    return {
      apiKey: credentials.apiKey,
      providerId: provider.id,
    };
  }

  private async fetchAccountInfo(connection: any): Promise<any> {
    // Mock account info - in reality, this would call actual bank APIs
    return {
      type: AccountType.CHECKING,
      accountNumber: '****1234',
      routingNumber: '123456789',
      currency: 'USD',
      balance: 5000.0,
    };
  }

  private async fetchTransactions(
    connection: any,
    since: string,
  ): Promise<BankTransaction[]> {
    // Mock transaction fetch - in reality, this would call actual bank APIs
    const mockTransactions: BankTransaction[] = [
      {
        id: `txn_${Date.now()}_1`,
        accountId: connection.accountId,
        amount: -150.0,
        currency: 'USD',
        description: 'FLOWERS BY SARAH',
        merchantName: 'Flowers by Sarah',
        category: 'shopping',
        subcategory: 'flowers',
        date: new Date().toISOString(),
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        metadata: {
          merchantCategory: 'florists',
          originalDescription: 'FLOWERS BY SARAH 123 MAIN ST',
          tags: [],
          isRecurring: false,
          paymentMethod: 'debit_card',
        },
        weddingRelated: false, // Will be determined by categorization
        confidence: 0,
        manuallyVerified: false,
      },
      {
        id: `txn_${Date.now()}_2`,
        accountId: connection.accountId,
        amount: -2500.0,
        currency: 'USD',
        description: 'GRAND BALLROOM VENUE',
        merchantName: 'Grand Ballroom',
        category: 'entertainment',
        subcategory: 'venues',
        date: new Date().toISOString(),
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        metadata: {
          merchantCategory: 'event_venues',
          originalDescription: 'GRAND BALLROOM EVENT CENTER DEPOSIT',
          tags: [],
          isRecurring: false,
          paymentMethod: 'credit_card',
        },
        weddingRelated: false, // Will be determined by categorization
        confidence: 0,
        manuallyVerified: false,
      },
    ];

    return mockTransactions;
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  }

  private async loadConnectedAccounts(): Promise<void> {
    // Load from local storage or database
    try {
      const stored = localStorage.getItem('connected_bank_accounts');
      if (stored) {
        const accounts: BankAccount[] = JSON.parse(stored);
        accounts.forEach((account) => {
          this.connectedAccounts.set(account.id, account);
        });
      }
    } catch (error) {
      console.error('[Banking] Failed to load connected accounts:', error);
    }
  }

  private async performInitialSync(accountId: string): Promise<void> {
    try {
      await this.syncTransactions(accountId);
    } catch (error) {
      console.error('[Banking] Initial sync failed:', error);
      // Don't throw - connection still valid
    }
  }

  // ==================== PUBLIC API ====================

  public getSupportedProviders(): BankingProvider[] {
    return Array.from(this.providers.values());
  }

  public getConnectedAccounts(): BankAccount[] {
    return Array.from(this.connectedAccounts.values());
  }

  public async getTransactionHistory(
    accountId: string,
    days: number = 30,
  ): Promise<BankTransaction[]> {
    const connection = await this.securityManager.getConnection(accountId);
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();
    return await this.fetchTransactions(connection, since);
  }

  public async manuallyCategorizeTransaction(
    transactionId: string,
    categoryId: string,
  ): Promise<void> {
    // Update transaction category and mark as manually verified
    // This would also update the auto-categorization learning model
    await this.categoryEngine.learnFromManualCategorization(
      transactionId,
      categoryId,
    );
  }

  public getCategorizationRules(): AutoCategorizationRule[] {
    return this.categoryEngine.getRules();
  }

  public async addCategorizationRule(
    rule: Omit<AutoCategorizationRule, 'id'>,
  ): Promise<AutoCategorizationRule> {
    return await this.categoryEngine.addRule(rule);
  }

  public destroy(): void {
    this.syncScheduler.destroy();
    this.connectedAccounts.clear();
  }
}

// ==================== AUTO CATEGORIZATION ENGINE ====================

class AutoCategorizationEngine {
  private rules: AutoCategorizationRule[] = [];
  private weddingKeywords: string[] = [];
  private categoryMappings: WeddingCategoryMapping[] = [];

  async initialize(): Promise<void> {
    await this.loadWeddingKeywords();
    await this.loadCategoryMappings();
    await this.loadCategorizationRules();
  }

  async categorizeTransaction(
    transaction: BankTransaction,
  ): Promise<BankTransaction> {
    let maxConfidence = 0;
    let bestCategory: string | undefined;
    let isWeddingRelated = false;

    // Check against wedding keywords
    const weddingConfidence = this.checkWeddingRelevance(transaction);
    if (weddingConfidence > 0.7) {
      isWeddingRelated = true;
    }

    // Apply categorization rules
    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      const confidence = this.evaluateRule(rule, transaction);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        if (rule.action.type === 'assign_category' && rule.action.categoryId) {
          bestCategory = rule.action.categoryId;
        }
      }
    }

    // Update transaction with categorization results
    transaction.weddingRelated = isWeddingRelated;
    transaction.confidence = weddingConfidence;
    transaction.suggestedCategory = bestCategory;

    return transaction;
  }

  private checkWeddingRelevance(transaction: BankTransaction): number {
    const text =
      `${transaction.description} ${transaction.merchantName || ''}`.toLowerCase();

    let matches = 0;
    for (const keyword of this.weddingKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    // Check merchant categories
    if (transaction.metadata.merchantCategory) {
      const category = transaction.metadata.merchantCategory.toLowerCase();
      const weddingCategories = [
        'florists',
        'event_venues',
        'photographers',
        'caterers',
        'bridal_shops',
      ];
      if (weddingCategories.includes(category)) {
        matches += 2; // Higher weight for merchant category
      }
    }

    return Math.min(1.0, matches / 3); // Normalize to 0-1 scale
  }

  private evaluateRule(
    rule: AutoCategorizationRule,
    transaction: BankTransaction,
  ): number {
    let confidence = 0;
    let satisfiedConditions = 0;

    for (const condition of rule.conditions) {
      if (this.evaluateCondition(condition, transaction)) {
        satisfiedConditions++;
      }
    }

    if (satisfiedConditions === rule.conditions.length) {
      confidence = rule.action.confidence;
    } else if (satisfiedConditions > 0) {
      confidence =
        rule.action.confidence * (satisfiedConditions / rule.conditions.length);
    }

    return confidence;
  }

  private evaluateCondition(
    condition: CategoryCondition,
    transaction: BankTransaction,
  ): boolean {
    let value: any;

    switch (condition.field) {
      case 'description':
        value = transaction.description;
        break;
      case 'merchant':
        value = transaction.merchantName || '';
        break;
      case 'amount':
        value = Math.abs(transaction.amount);
        break;
      case 'category':
        value = transaction.category || '';
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'contains':
        const text = condition.caseSensitive ? value : value.toLowerCase();
        const searchText = condition.caseSensitive
          ? condition.value
          : condition.value.toLowerCase();
        return text.includes(searchText);
      case 'equals':
        return value === condition.value;
      case 'greater_than':
        return typeof value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && value < condition.value;
      case 'in_range':
        return (
          typeof value === 'number' &&
          value >= condition.value.min &&
          value <= condition.value.max
        );
      default:
        return false;
    }
  }

  private async loadWeddingKeywords(): Promise<void> {
    this.weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'bridal',
      'venue',
      'reception',
      'ceremony',
      'flowers',
      'bouquet',
      'photographer',
      'catering',
      'cake',
      'dress',
      'tuxedo',
      'rings',
      'invitation',
      'honeymoon',
      'dj',
      'band',
      'music',
      'decoration',
      'centerpiece',
      'linens',
    ];
  }

  private async loadCategoryMappings(): Promise<void> {
    this.categoryMappings = [
      {
        bankCategory: 'entertainment',
        weddingCategory: 'venue',
        keywords: ['venue', 'hall', 'ballroom', 'reception'],
        merchantPatterns: ['*BALLROOM*', '*VENUE*', '*HALL*'],
        confidenceThreshold: 0.8,
        autoApprove: true,
      },
      {
        bankCategory: 'shopping',
        weddingCategory: 'flowers',
        keywords: ['flowers', 'florist', 'bouquet'],
        merchantPatterns: ['*FLOWERS*', '*FLORIST*'],
        confidenceThreshold: 0.9,
        autoApprove: true,
      },
    ];
  }

  private async loadCategorizationRules(): Promise<void> {
    this.rules = [
      {
        id: 'rule_1',
        name: 'Venue Detection',
        conditions: [
          {
            field: 'description',
            operator: 'contains',
            value: 'venue',
            caseSensitive: false,
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 1000,
          },
        ],
        action: {
          type: 'assign_category',
          categoryId: 'venue',
          confidence: 0.9,
          createBudgetItem: true,
        },
        priority: 1,
        isActive: true,
        accuracy: 0.85,
      },
      {
        id: 'rule_2',
        name: 'Floral Detection',
        conditions: [
          {
            field: 'merchant',
            operator: 'contains',
            value: 'flower',
            caseSensitive: false,
          },
        ],
        action: {
          type: 'assign_category',
          categoryId: 'flowers',
          confidence: 0.95,
          createBudgetItem: true,
        },
        priority: 2,
        isActive: true,
        accuracy: 0.92,
      },
    ];
  }

  async learnFromManualCategorization(
    transactionId: string,
    categoryId: string,
  ): Promise<void> {
    // Machine learning would update models here
    // For now, just log the correction
    console.log(
      `[Banking] Learning: Transaction ${transactionId} manually categorized as ${categoryId}`,
    );
  }

  getRules(): AutoCategorizationRule[] {
    return [...this.rules];
  }

  async addRule(
    rule: Omit<AutoCategorizationRule, 'id'>,
  ): Promise<AutoCategorizationRule> {
    const newRule: AutoCategorizationRule = {
      ...rule,
      id: `rule_${Date.now()}`,
    };

    this.rules.push(newRule);
    return newRule;
  }
}

// ==================== SYNC SCHEDULER ====================

class BankSyncScheduler {
  private scheduledSyncs: Map<string, NodeJS.Timeout> = new Map();
  private syncIntervals: Map<string, number> = new Map(); // Account ID -> interval in ms

  async initialize(): Promise<void> {
    console.log('[Banking] Sync scheduler initialized');
  }

  async scheduleSync(
    accountId: string,
    intervalHours: number = 6,
  ): Promise<void> {
    // Cancel existing sync if any
    this.cancelSync(accountId);

    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.syncIntervals.set(accountId, intervalMs);

    const timeout = setTimeout(async () => {
      try {
        const bankingManager = MobileBankingIntegrationManager.getInstance();
        await bankingManager.syncTransactions(accountId);

        // Reschedule next sync
        this.scheduleSync(accountId, intervalHours);
      } catch (error) {
        console.error(
          `[Banking] Scheduled sync failed for ${accountId}:`,
          error,
        );
      }
    }, intervalMs);

    this.scheduledSyncs.set(accountId, timeout);
    console.log(
      `[Banking] Scheduled sync for ${accountId} every ${intervalHours} hours`,
    );
  }

  cancelSync(accountId: string): void {
    const timeout = this.scheduledSyncs.get(accountId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledSyncs.delete(accountId);
      this.syncIntervals.delete(accountId);
    }
  }

  getNextSyncDate(accountId: string): string {
    const interval = this.syncIntervals.get(accountId);
    if (!interval) return '';

    return new Date(Date.now() + interval).toISOString();
  }

  destroy(): void {
    this.scheduledSyncs.forEach((timeout) => clearTimeout(timeout));
    this.scheduledSyncs.clear();
    this.syncIntervals.clear();
  }
}

// ==================== SECURITY MANAGER ====================

class BankingSecurityManager {
  private encryptionKey: string = '';

  async initialize(): Promise<void> {
    // Initialize encryption for secure credential storage
    this.encryptionKey = await this.generateEncryptionKey();
    console.log('[Banking] Security manager initialized');
  }

  async validateCredentials(
    providerId: string,
    credentials: any,
  ): Promise<any> {
    // Validate credential format and security requirements
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('Invalid credentials format');
    }

    // Provider-specific validation
    switch (providerId) {
      case 'chase':
      case 'bofa':
      case 'wells_fargo':
        if (!credentials.username || !credentials.password) {
          throw new Error('Username and password required');
        }
        break;
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }

    // Encrypt sensitive data
    return this.encryptCredentials(credentials);
  }

  async storeConnection(accountId: string, connection: any): Promise<void> {
    const encrypted = await this.encryptData(JSON.stringify(connection));
    localStorage.setItem(`bank_connection_${accountId}`, encrypted);
  }

  async getConnection(accountId: string): Promise<any> {
    const encrypted = localStorage.getItem(`bank_connection_${accountId}`);
    if (!encrypted) {
      throw new Error('Connection not found');
    }

    const decrypted = await this.decryptData(encrypted);
    return JSON.parse(decrypted);
  }

  async revokeConnection(accountId: string): Promise<void> {
    localStorage.removeItem(`bank_connection_${accountId}`);
    // In reality, would also revoke tokens with the bank's API
  }

  private async generateEncryptionKey(): Promise<string> {
    // In a real app, this would use proper key management
    return 'secure_encryption_key_' + Date.now();
  }

  private async encryptCredentials(credentials: any): Promise<any> {
    // Simple encryption simulation - use proper encryption in production
    return {
      ...credentials,
      encrypted: true,
      timestamp: Date.now(),
    };
  }

  private async encryptData(data: string): Promise<string> {
    // Simple base64 encoding for demo - use proper encryption in production
    return btoa(data);
  }

  private async decryptData(encrypted: string): Promise<string> {
    // Simple base64 decoding for demo - use proper decryption in production
    return atob(encrypted);
  }
}

// ==================== SINGLETON EXPORT ====================

export const mobileBanking = MobileBankingIntegrationManager.getInstance();
export default MobileBankingIntegrationManager;
