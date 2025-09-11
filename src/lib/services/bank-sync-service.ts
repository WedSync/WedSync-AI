import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isAfter,
  isBefore,
} from 'date-fns';

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountNumber: string; // Last 4 digits only for security
  routingNumber?: string; // For verification only
  balance: number;
  currency: string;
  isActive: boolean;
  lastSyncAt?: Date;
  accessToken?: string; // Encrypted bank API token
}

export interface BankTransaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  merchantName?: string;
  category?: string;
  date: Date;
  type: 'debit' | 'credit';
  status: 'pending' | 'posted';
  transactionId: string; // Bank's unique ID
  balance?: number; // Account balance after transaction
  location?: string;
  isWeddingRelated?: boolean;
  confidence?: number; // ML confidence for wedding categorization
}

export interface SyncResult {
  success: boolean;
  accountId: string;
  transactionsCount: number;
  newTransactions: BankTransaction[];
  errors?: string[];
  lastSyncDate: Date;
}

export interface BankConnection {
  provider: 'plaid' | 'yodlee' | 'mx' | 'finicity';
  institutionId: string;
  institutionName: string;
  credentials: Record<string, string>;
  isConnected: boolean;
  lastError?: string;
}

export class BankSyncService {
  private accounts: BankAccount[] = [];
  private transactions: BankTransaction[] = [];
  private connections: BankConnection[] = [];
  private weddingKeywords = [
    'wedding',
    'bridal',
    'venue',
    'catering',
    'photographer',
    'videographer',
    'florist',
    'dj',
    'band',
    'baker',
    'cake',
    'dress',
    'tuxedo',
    'ring',
    'jewelry',
    'invitation',
    'stationery',
    'decoration',
    'rental',
  ];

  constructor() {
    this.initializeMockData();
  }

  // Initialize with mock data for demo purposes
  private initializeMockData() {
    this.accounts = [
      {
        id: 'acc-1',
        bankName: 'Chase Bank',
        accountType: 'checking',
        accountNumber: '****1234',
        balance: 15750.5,
        currency: 'USD',
        isActive: true,
        lastSyncAt: new Date(),
      },
      {
        id: 'acc-2',
        bankName: 'Wells Fargo',
        accountType: 'savings',
        accountNumber: '****5678',
        balance: 25000.0,
        currency: 'USD',
        isActive: true,
        lastSyncAt: new Date(),
      },
    ];
  }

  // Connect to bank using secure API (Plaid, Yodlee, etc.)
  async connectBank(
    connection: Omit<BankConnection, 'isConnected' | 'lastError'>,
  ): Promise<boolean> {
    try {
      // Simulate API connection
      const isValid = await this.validateBankCredentials(connection);

      if (isValid) {
        const newConnection: BankConnection = {
          ...connection,
          isConnected: true,
        };
        this.connections.push(newConnection);

        // Fetch accounts from the bank
        await this.fetchAccountsFromBank(connection.institutionId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Bank connection failed:', error);
      return false;
    }
  }

  // Validate bank credentials securely
  private async validateBankCredentials(
    connection: Omit<BankConnection, 'isConnected' | 'lastError'>,
  ): Promise<boolean> {
    // Simulate credential validation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation logic
    return connection.credentials.username && connection.credentials.password;
  }

  // Fetch accounts from connected bank
  private async fetchAccountsFromBank(institutionId: string): Promise<void> {
    // Simulate fetching accounts from bank API
    // In real implementation, this would call bank API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Sync transactions from all connected accounts
  async syncAllAccounts(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const account of this.accounts.filter((a) => a.isActive)) {
      const result = await this.syncAccount(account.id);
      results.push(result);
    }

    return results;
  }

  // Sync transactions for a specific account
  async syncAccount(accountId: string): Promise<SyncResult> {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    try {
      // Determine sync date range
      const lastSync = account.lastSyncAt || subMonths(new Date(), 3);
      const syncFromDate = lastSync;
      const syncToDate = new Date();

      // Fetch transactions from bank API
      const fetchedTransactions = await this.fetchTransactionsFromBank(
        accountId,
        syncFromDate,
        syncToDate,
      );

      // Filter out existing transactions
      const newTransactions = this.filterNewTransactions(
        fetchedTransactions,
        accountId,
      );

      // Categorize wedding-related transactions
      const categorizedTransactions =
        this.categorizeWeddingTransactions(newTransactions);

      // Store new transactions
      this.transactions.push(...categorizedTransactions);

      // Update account
      account.lastSyncAt = new Date();
      account.balance = await this.fetchAccountBalance(accountId);

      return {
        success: true,
        accountId,
        transactionsCount: fetchedTransactions.length,
        newTransactions: categorizedTransactions,
        lastSyncDate: new Date(),
      };
    } catch (error) {
      console.error(`Sync failed for account ${accountId}:`, error);
      return {
        success: false,
        accountId,
        transactionsCount: 0,
        newTransactions: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncDate: new Date(),
      };
    }
  }

  // Fetch transactions from bank API (mock implementation)
  private async fetchTransactionsFromBank(
    accountId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<BankTransaction[]> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock transaction data
    const mockTransactions: BankTransaction[] = [
      {
        id: `txn-${Date.now()}-1`,
        accountId,
        amount: -3500.0,
        description: 'BELLA VISTA WEDDING VENUE',
        merchantName: 'Bella Vista Venue',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        type: 'debit',
        status: 'posted',
        transactionId: 'bank-txn-12345',
        location: 'Austin, TX',
      },
      {
        id: `txn-${Date.now()}-2`,
        accountId,
        amount: -2800.0,
        description: 'SARAH MITCHELL PHOTOGRAPHY',
        merchantName: 'Sarah Mitchell Photography',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        type: 'debit',
        status: 'posted',
        transactionId: 'bank-txn-12346',
        location: 'Austin, TX',
      },
      {
        id: `txn-${Date.now()}-3`,
        accountId,
        amount: -1200.0,
        description: 'BLOOMING GARDENS FLORIST',
        merchantName: 'Blooming Gardens',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        type: 'debit',
        status: 'posted',
        transactionId: 'bank-txn-12347',
        location: 'Austin, TX',
      },
      {
        id: `txn-${Date.now()}-4`,
        accountId,
        amount: -850.0,
        description: 'PARTY RENTAL COMPANY',
        merchantName: 'Party Rentals Plus',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        type: 'debit',
        status: 'posted',
        transactionId: 'bank-txn-12348',
        location: 'Austin, TX',
      },
    ];

    return mockTransactions.filter(
      (t) => isAfter(t.date, fromDate) && isBefore(t.date, toDate),
    );
  }

  // Fetch current account balance
  private async fetchAccountBalance(accountId: string): Promise<number> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    const account = this.accounts.find((a) => a.id === accountId);
    return account ? account.balance : 0;
  }

  // Filter out transactions that already exist
  private filterNewTransactions(
    fetchedTransactions: BankTransaction[],
    accountId: string,
  ): BankTransaction[] {
    const existingTransactionIds = new Set(
      this.transactions
        .filter((t) => t.accountId === accountId)
        .map((t) => t.transactionId),
    );

    return fetchedTransactions.filter(
      (t) => !existingTransactionIds.has(t.transactionId),
    );
  }

  // Categorize wedding-related transactions using ML/keyword matching
  private categorizeWeddingTransactions(
    transactions: BankTransaction[],
  ): BankTransaction[] {
    return transactions.map((transaction) => {
      const description = transaction.description.toLowerCase();
      const merchantName = (transaction.merchantName || '').toLowerCase();

      let isWeddingRelated = false;
      let confidence = 0;
      let category = 'other';

      // Check for wedding keywords
      for (const keyword of this.weddingKeywords) {
        if (description.includes(keyword) || merchantName.includes(keyword)) {
          isWeddingRelated = true;
          confidence += 0.3;

          // Assign specific category based on keyword
          if (
            ['venue', 'hall', 'ballroom'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'venue';
          } else if (
            ['photo', 'camera'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'photography';
          } else if (
            ['flower', 'floral', 'bouquet'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'flowers';
          } else if (
            ['catering', 'food', 'beverage'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'catering';
          } else if (
            ['dj', 'band', 'music'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'music';
          } else if (
            ['cake', 'baker'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'cake';
          } else if (
            ['dress', 'bridal', 'tuxedo'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'attire';
          } else if (
            ['ring', 'jewelry'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'jewelry';
          } else if (
            ['invitation', 'stationery'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'stationery';
          } else if (
            ['rental', 'decoration'].some(
              (k) => description.includes(k) || merchantName.includes(k),
            )
          ) {
            category = 'decoration';
          }
        }
      }

      // Additional heuristics
      if (transaction.amount < -500) {
        // Large expenses are more likely wedding-related
        confidence += 0.2;
      }

      if (
        transaction.location &&
        ['venue', 'chapel', 'resort'].some((k) =>
          transaction.location!.toLowerCase().includes(k),
        )
      ) {
        confidence += 0.2;
        isWeddingRelated = true;
      }

      // Cap confidence at 1.0
      confidence = Math.min(confidence, 1.0);

      return {
        ...transaction,
        category: isWeddingRelated ? category : undefined,
        isWeddingRelated,
        confidence,
      };
    });
  }

  // Get wedding-related transactions
  getWeddingTransactions(accountId?: string): BankTransaction[] {
    return this.transactions.filter(
      (t) =>
        t.isWeddingRelated &&
        (confidence ?? 0) > 0.5 &&
        (!accountId || t.accountId === accountId),
    );
  }

  // Get transactions by category
  getTransactionsByCategory(
    category: string,
    accountId?: string,
  ): BankTransaction[] {
    return this.transactions.filter(
      (t) =>
        t.category === category && (!accountId || t.accountId === accountId),
    );
  }

  // Get spending summary by category
  getSpendingSummary(months: number = 6): Record<string, number> {
    const cutoffDate = subMonths(new Date(), months);
    const weddingTransactions = this.transactions.filter(
      (t) =>
        t.isWeddingRelated && isAfter(t.date, cutoffDate) && t.type === 'debit',
    );

    const summary: Record<string, number> = {};
    weddingTransactions.forEach((t) => {
      const category = t.category || 'other';
      summary[category] = (summary[category] || 0) + Math.abs(t.amount);
    });

    return summary;
  }

  // Get account balances
  getAccountBalances(): Array<{
    accountId: string;
    bankName: string;
    balance: number;
    currency: string;
  }> {
    return this.accounts.map((account) => ({
      accountId: account.id,
      bankName: account.bankName,
      balance: account.balance,
      currency: account.currency,
    }));
  }

  // Set wedding transaction category manually
  setTransactionCategory(
    transactionId: string,
    category: string,
    isWeddingRelated: boolean = true,
  ): boolean {
    const transaction = this.transactions.find((t) => t.id === transactionId);
    if (transaction) {
      transaction.category = category;
      transaction.isWeddingRelated = isWeddingRelated;
      transaction.confidence = 1.0; // Manual categorization has full confidence
      return true;
    }
    return false;
  }

  // Remove account
  removeAccount(accountId: string): boolean {
    const index = this.accounts.findIndex((a) => a.id === accountId);
    if (index !== -1) {
      this.accounts.splice(index, 1);
      // Remove associated transactions
      this.transactions = this.transactions.filter(
        (t) => t.accountId !== accountId,
      );
      return true;
    }
    return false;
  }

  // Get sync status
  getSyncStatus(): Array<{
    accountId: string;
    bankName: string;
    lastSync: Date | null;
    isActive: boolean;
  }> {
    return this.accounts.map((account) => ({
      accountId: account.id,
      bankName: account.bankName,
      lastSync: account.lastSyncAt || null,
      isActive: account.isActive,
    }));
  }

  // Enable/disable account sync
  toggleAccountSync(accountId: string, isActive: boolean): boolean {
    const account = this.accounts.find((a) => a.id === accountId);
    if (account) {
      account.isActive = isActive;
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

  // Get transaction count
  getTransactionCount(): number {
    return this.transactions.length;
  }

  // Get wedding transaction count
  getWeddingTransactionCount(): number {
    return this.transactions.filter((t) => t.isWeddingRelated).length;
  }
}
