import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface BankAccount {
  id: string;
  institutionName: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountNumber: string; // Last 4 digits only
  balance: number;
  currency: string;
  isConnected: boolean;
  lastSyncedAt?: Date;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: Date;
  description: string;
  amount: number;
  category?: string;
  merchantName?: string;
  pending: boolean;
  type: 'debit' | 'credit';
  originalDescription: string;
  notes?: string;
  tags?: string[];
}

export interface SyncResult {
  success: boolean;
  accountsUpdated: number;
  transactionsImported: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface PlaidConfig {
  clientId?: string;
  secret?: string;
  environment?: 'sandbox' | 'development' | 'production';
  publicKey?: string;
}

// Transaction categorization rules
interface CategoryRule {
  patterns: RegExp[];
  category: string;
  confidence: number;
}

export class BankSyncService {
  private accounts: BankAccount[] = [];
  private transactions: BankTransaction[] = [];
  private categoryRules: CategoryRule[] = [];
  private plaidConfig: PlaidConfig = {};

  constructor(config?: PlaidConfig) {
    if (config) {
      this.plaidConfig = config;
    }
    this.initializeCategoryRules();
  }

  private initializeCategoryRules() {
    this.categoryRules = [
      {
        patterns: [/venue/i, /hall/i, /resort/i, /country club/i],
        category: 'venue',
        confidence: 0.9,
      },
      {
        patterns: [/catering/i, /food service/i, /restaurant/i],
        category: 'catering',
        confidence: 0.85,
      },
      {
        patterns: [/photo/i, /portrait/i, /camera/i],
        category: 'photography',
        confidence: 0.85,
      },
      {
        patterns: [/video/i, /film/i, /cinemat/i],
        category: 'videography',
        confidence: 0.85,
      },
      {
        patterns: [/flower/i, /floral/i, /bouquet/i],
        category: 'flowers',
        confidence: 0.9,
      },
      {
        patterns: [/dj\s/i, /music/i, /band/i, /entertainment/i],
        category: 'music',
        confidence: 0.8,
      },
      {
        patterns: [/decor/i, /rental/i, /lighting/i, /draping/i],
        category: 'decoration',
        confidence: 0.8,
      },
      {
        patterns: [/dress/i, /bridal/i, /tux/i, /formal wear/i],
        category: 'attire',
        confidence: 0.85,
      },
      {
        patterns: [/makeup/i, /hair/i, /salon/i, /spa/i, /beauty/i],
        category: 'beauty',
        confidence: 0.85,
      },
      {
        patterns: [/limo/i, /transport/i, /car service/i],
        category: 'transportation',
        confidence: 0.85,
      },
      {
        patterns: [/jewel/i, /ring/i, /diamond/i],
        category: 'jewelry',
        confidence: 0.9,
      },
      {
        patterns: [/invitation/i, /stationery/i, /printing/i],
        category: 'stationery',
        confidence: 0.85,
      },
      {
        patterns: [/cake/i, /bakery/i, /dessert/i],
        category: 'cake',
        confidence: 0.9,
      },
      {
        patterns: [/favor/i, /gift/i, /souvenir/i],
        category: 'favors',
        confidence: 0.8,
      },
    ];
  }

  // Initialize Plaid Link for bank connection
  async initializePlaidLink(userId: string): Promise<{ linkToken: string }> {
    // In production, this would call Plaid API to create a link token
    // For demo purposes, returning a mock token
    return {
      linkToken: `link-${userId}-${Date.now()}`,
    };
  }

  // Connect a bank account
  async connectBankAccount(
    publicToken: string,
    userId: string,
  ): Promise<BankAccount[]> {
    // In production, this would exchange public token for access token
    // and fetch real account data from Plaid

    // Mock implementation for demo
    const mockAccounts: BankAccount[] = [
      {
        id: `acc-${Date.now()}-1`,
        institutionName: 'Chase Bank',
        accountName: 'Wedding Checking',
        accountType: 'checking',
        accountNumber: '4567',
        balance: 25000,
        currency: 'USD',
        isConnected: true,
        lastSyncedAt: new Date(),
      },
      {
        id: `acc-${Date.now()}-2`,
        institutionName: 'Chase Bank',
        accountName: 'Wedding Savings',
        accountType: 'savings',
        accountNumber: '8901',
        balance: 15000,
        currency: 'USD',
        isConnected: true,
        lastSyncedAt: new Date(),
      },
    ];

    this.accounts.push(...mockAccounts);
    return mockAccounts;
  }

  // Sync transactions from connected accounts
  async syncTransactions(
    accountId?: string,
    daysBack: number = 30,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      accountsUpdated: 0,
      transactionsImported: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      const accountsToSync = accountId
        ? this.accounts.filter((a) => a.id === accountId)
        : this.accounts.filter((a) => a.isConnected);

      for (const account of accountsToSync) {
        try {
          const transactions = await this.fetchTransactionsForAccount(
            account,
            daysBack,
          );
          this.transactions.push(...transactions);
          result.transactionsImported += transactions.length;
          result.accountsUpdated++;

          // Update last synced time
          account.lastSyncedAt = new Date();
        } catch (error) {
          result.errors.push(`Failed to sync ${account.accountName}: ${error}`);
        }
      }

      result.success = result.accountsUpdated > 0;
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
    }

    return result;
  }

  // Fetch transactions for a specific account
  private async fetchTransactionsForAccount(
    account: BankAccount,
    daysBack: number,
  ): Promise<BankTransaction[]> {
    // In production, this would call Plaid API
    // Mock implementation generates sample transactions
    const transactions: BankTransaction[] = [];
    const startDate = subDays(new Date(), daysBack);

    // Generate sample wedding-related transactions
    const mockTransactions = [
      {
        merchant: 'Elegant Events Venue',
        amount: 5000,
        category: 'venue',
        daysAgo: 10,
      },
      {
        merchant: 'Gourmet Catering Co',
        amount: 3500,
        category: 'catering',
        daysAgo: 15,
      },
      {
        merchant: 'Bloom Floral Design',
        amount: 1200,
        category: 'flowers',
        daysAgo: 5,
      },
      {
        merchant: 'Studio Photography',
        amount: 2500,
        category: 'photography',
        daysAgo: 20,
      },
      {
        merchant: 'DJ Entertainment Services',
        amount: 1000,
        category: 'music',
        daysAgo: 8,
      },
      {
        merchant: 'Bridal Boutique',
        amount: 1800,
        category: 'attire',
        daysAgo: 25,
      },
      {
        merchant: 'Sweet Cakes Bakery',
        amount: 600,
        category: 'cake',
        daysAgo: 3,
      },
      {
        merchant: 'Print Express',
        amount: 400,
        category: 'stationery',
        daysAgo: 18,
      },
    ];

    mockTransactions.forEach((mock, index) => {
      const transactionDate = subDays(new Date(), mock.daysAgo);
      if (transactionDate >= startDate) {
        transactions.push({
          id: `txn-${account.id}-${Date.now()}-${index}`,
          accountId: account.id,
          date: transactionDate,
          description: mock.merchant,
          merchantName: mock.merchant,
          amount: mock.amount,
          category: mock.category,
          pending: mock.daysAgo < 2,
          type: 'debit',
          originalDescription: mock.merchant.toUpperCase(),
        });
      }
    });

    return transactions;
  }

  // Categorize a transaction automatically
  categorizeTransaction(transaction: BankTransaction): {
    category: string;
    confidence: number;
  } {
    const description = (
      transaction.description +
      ' ' +
      transaction.merchantName
    ).toLowerCase();

    for (const rule of this.categoryRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(description)) {
          return {
            category: rule.category,
            confidence: rule.confidence,
          };
        }
      }
    }

    return {
      category: 'other',
      confidence: 0.5,
    };
  }

  // Bulk categorize transactions
  async categorizeTransactions(
    transactions: BankTransaction[],
  ): Promise<BankTransaction[]> {
    return transactions.map((transaction) => {
      if (!transaction.category) {
        const { category, confidence } =
          this.categorizeTransaction(transaction);
        if (confidence > 0.7) {
          transaction.category = category;
        }
      }
      return transaction;
    });
  }

  // Get transaction summary
  getTransactionSummary(
    startDate?: Date,
    endDate?: Date,
    accountId?: string,
  ): {
    totalSpent: number;
    totalReceived: number;
    netAmount: number;
    transactionCount: number;
    categoryBreakdown: Record<string, number>;
  } {
    let filteredTransactions = this.transactions;

    if (accountId) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.accountId === accountId,
      );
    }

    if (startDate) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.date >= startDate,
      );
    }

    if (endDate) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.date <= endDate,
      );
    }

    const totalSpent = filteredTransactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalReceived = filteredTransactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'debit' && t.category)
      .forEach((t) => {
        categoryBreakdown[t.category!] =
          (categoryBreakdown[t.category!] || 0) + t.amount;
      });

    return {
      totalSpent,
      totalReceived,
      netAmount: totalReceived - totalSpent,
      transactionCount: filteredTransactions.length,
      categoryBreakdown,
    };
  }

  // Search transactions
  searchTransactions(query: string): BankTransaction[] {
    const searchTerm = query.toLowerCase();
    return this.transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(searchTerm) ||
        t.merchantName?.toLowerCase().includes(searchTerm) ||
        t.category?.toLowerCase().includes(searchTerm) ||
        t.notes?.toLowerCase().includes(searchTerm) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)),
    );
  }

  // Add manual transaction
  addManualTransaction(
    transaction: Omit<BankTransaction, 'id'>,
  ): BankTransaction {
    const newTransaction: BankTransaction = {
      ...transaction,
      id: `manual-${Date.now()}`,
    };
    this.transactions.push(newTransaction);
    return newTransaction;
  }

  // Update transaction
  updateTransaction(
    id: string,
    updates: Partial<BankTransaction>,
  ): BankTransaction | null {
    const index = this.transactions.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updates };
      return this.transactions[index];
    }
    return null;
  }

  // Disconnect bank account
  async disconnectAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.find((a) => a.id === accountId);
    if (account) {
      account.isConnected = false;
      // Remove associated transactions
      this.transactions = this.transactions.filter(
        (t) => t.accountId !== accountId,
      );
      return true;
    }
    return false;
  }

  // Get all accounts
  getAccounts(): BankAccount[] {
    return this.accounts;
  }

  // Get all transactions
  getTransactions(accountId?: string): BankTransaction[] {
    if (accountId) {
      return this.transactions.filter((t) => t.accountId === accountId);
    }
    return this.transactions;
  }

  // Export transactions
  exportTransactions(format: 'csv' | 'json' = 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.transactions, null, 2);
    }

    // CSV export
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Category',
      'Account',
      'Type',
    ];
    const rows = this.transactions.map((t) => [
      format(t.date, 'yyyy-MM-dd'),
      t.description,
      t.amount.toString(),
      t.category || '',
      this.accounts.find((a) => a.id === t.accountId)?.accountName || '',
      t.type,
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
  }

  // Get spending insights
  getSpendingInsights(): {
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    unusualSpending: BankTransaction[];
    recurringCharges: Array<{
      merchant: string;
      amount: number;
      frequency: string;
    }>;
  } {
    const categoryTotals = this.getTransactionSummary().categoryBreakdown;
    const totalSpent = Object.values(categoryTotals).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpent) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Find unusual spending (transactions > 2x average)
    const avgTransaction = totalSpent / this.transactions.length;
    const unusualSpending = this.transactions.filter(
      (t) => t.type === 'debit' && t.amount > avgTransaction * 2,
    );

    // Find recurring charges
    const merchantGroups = new Map<string, BankTransaction[]>();
    this.transactions.forEach((t) => {
      if (t.merchantName) {
        const existing = merchantGroups.get(t.merchantName) || [];
        existing.push(t);
        merchantGroups.set(t.merchantName, existing);
      }
    });

    const recurringCharges: Array<{
      merchant: string;
      amount: number;
      frequency: string;
    }> = [];
    merchantGroups.forEach((transactions, merchant) => {
      if (transactions.length >= 2) {
        const amounts = transactions.map((t) => t.amount);
        const avgAmount =
          amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

        // Check if amounts are consistent
        const isConsistent = amounts.every(
          (a) => Math.abs(a - avgAmount) < avgAmount * 0.1,
        );

        if (isConsistent) {
          recurringCharges.push({
            merchant,
            amount: avgAmount,
            frequency: transactions.length === 2 ? 'occasional' : 'regular',
          });
        }
      }
    });

    return {
      topCategories,
      unusualSpending,
      recurringCharges,
    };
  }
}
