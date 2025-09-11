'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Camera,
  Bank,
  Bell,
  BarChart3,
  PiggyBank,
  Upload,
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import {
  BudgetAnalyticsService,
  type SpendingTrend,
  type BudgetForecast,
  type VendorComparison,
  type SavingsOpportunity,
} from '@/lib/services/budget-analytics';
import {
  ReceiptScannerService,
  type ReceiptData,
} from '@/lib/services/receipt-scanner';
import {
  BankSyncService,
  type BankAccount,
  type BankTransaction,
} from '@/lib/services/bank-sync';
import {
  PaymentRemindersService,
  type PaymentReminder,
} from '@/lib/services/payment-reminders';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedBudgetTrackerProps {
  weddingId: string;
  initialBudget: number;
  className?: string;
}

export function EnhancedBudgetTracker({
  weddingId,
  initialBudget,
  className,
}: EnhancedBudgetTrackerProps) {
  // Services
  const [analyticsService] = useState(() => new BudgetAnalyticsService());
  const [receiptScanner] = useState(() => new ReceiptScannerService());
  const [bankSync] = useState(() => new BankSyncService());
  const [remindersService] = useState(() => new PaymentRemindersService());

  // Analytics State
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [forecast, setForecast] = useState<BudgetForecast | null>(null);
  const [vendorComparisons, setVendorComparisons] = useState<
    VendorComparison[]
  >([]);
  const [savingsOpportunities, setSavingsOpportunities] = useState<
    SavingsOpportunity[]
  >([]);

  // Bank Sync State
  const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(
    [],
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Receipt Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedReceipt, setLastScannedReceipt] =
    useState<ReceiptData | null>(null);

  // Payment Reminders State
  const [upcomingReminders, setUpcomingReminders] = useState<PaymentReminder[]>(
    [],
  );
  const [reminderStats, setReminderStats] = useState<any>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    'trends' | 'forecast' | 'vendors' | 'savings'
  >('trends');
  const [showBankConnect, setShowBankConnect] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAnalytics();
    loadReminders();
    loadBankAccounts();
  }, []);

  const loadAnalytics = async () => {
    // Calculate analytics
    const trends = analyticsService.calculateSpendingTrends(6);
    setSpendingTrends(trends);

    const budgetForecast = analyticsService.generateBudgetForecast(3);
    setForecast(budgetForecast);

    const vendors = analyticsService.compareVendors();
    setVendorComparisons(vendors);

    const savings = analyticsService.identifySavingsOpportunities();
    setSavingsOpportunities(savings);
  };

  const loadReminders = async () => {
    const upcoming = remindersService.getUpcomingReminders(30);
    setUpcomingReminders(upcoming);

    const stats = remindersService.getReminderStatistics();
    setReminderStats(stats);
  };

  const loadBankAccounts = async () => {
    const accounts = bankSync.getAccounts();
    setConnectedAccounts(accounts);

    const transactions = bankSync.getTransactions();
    setBankTransactions(transactions);
  };

  // Handle receipt upload
  const handleReceiptUpload = async (file: File) => {
    setIsScanning(true);
    try {
      const result = await receiptScanner.scanReceipt(file);

      if (result.success && result.data) {
        setLastScannedReceipt(result.data);

        // Add to analytics
        analyticsService.addTransaction({
          id: `receipt-${Date.now()}`,
          date: result.data.date || new Date(),
          amount: result.data.totalAmount,
          category: result.data.category || 'other',
          vendor: result.data.vendor,
          description: `Receipt from ${result.data.vendor}`,
        });

        // Reload analytics
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Receipt scanning failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle bank sync
  const handleBankSync = async () => {
    setIsSyncing(true);
    try {
      const result = await bankSync.syncTransactions();

      if (result.success) {
        // Categorize new transactions
        const categorized = await bankSync.categorizeTransactions(
          bankSync.getTransactions(),
        );

        // Add to analytics
        categorized.forEach((transaction) => {
          analyticsService.addTransaction({
            id: transaction.id,
            date: transaction.date,
            amount: transaction.amount,
            category: transaction.category || 'other',
            vendor: transaction.merchantName,
            description: transaction.description,
          });
        });

        setBankTransactions(categorized);
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Bank sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle bank connection
  const handleConnectBank = async () => {
    try {
      const { linkToken } = await bankSync.initializePlaidLink(weddingId);
      // In production, this would open Plaid Link
      const accounts = await bankSync.connectBankAccount(linkToken, weddingId);
      setConnectedAccounts(accounts);
      setShowBankConnect(false);

      // Initial sync
      await handleBankSync();
    } catch (error) {
      console.error('Bank connection failed:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Enhanced Budget Tracker
          </h2>

          <div className="flex gap-2">
            {/* Receipt Scanner */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReceiptUpload(file);
                }}
              />
              <div className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Scan Receipt</span>
                  </>
                )}
              </div>
            </label>

            {/* Bank Sync */}
            {connectedAccounts.length > 0 ? (
              <button
                onClick={handleBankSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Bank className="w-4 h-4" />
                    <span>Sync Bank</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowBankConnect(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <Bank className="w-4 h-4" />
                <span>Connect Bank</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                bankTransactions.reduce(
                  (sum, t) => sum + (t.type === 'debit' ? t.amount : 0),
                  0,
                ),
              )}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Monthly Trend</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {spendingTrends.length > 0
                ? formatPercentage(
                    spendingTrends[spendingTrends.length - 1].percentageChange,
                  )
                : '0%'}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <PiggyBank className="w-4 h-4" />
              <span>Potential Savings</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(
                savingsOpportunities.reduce(
                  (sum, o) => sum + o.potentialSavings,
                  0,
                ),
              )}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Bell className="w-4 h-4" />
              <span>Upcoming Payments</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {upcomingReminders.length}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b">
          <div className="flex">
            {(['trends', 'forecast', 'vendors', 'savings'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Spending Trends */}
          {activeTab === 'trends' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Spending Trends</h3>

              {spendingTrends.map((trend, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{trend.period}</p>
                    <p className="text-sm text-gray-600">
                      {Object.keys(trend.categoryBreakdown).length} categories
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatCurrency(trend.totalSpent)}
                    </p>
                    <p
                      className={cn(
                        'text-sm flex items-center gap-1',
                        trend.percentageChange > 0
                          ? 'text-red-600'
                          : 'text-green-600',
                      )}
                    >
                      {trend.percentageChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatPercentage(trend.percentageChange)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Budget Forecast */}
          {activeTab === 'forecast' && forecast && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Budget Forecast</h3>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Projected Total (Next 3 Months)
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(forecast.projectedTotal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Confidence</p>
                    <p className="text-lg font-medium">
                      {(forecast.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Monthly Projections */}
                <div className="space-y-2">
                  {forecast.monthlyProjections.map((projection, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{projection.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(projection.projected)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(projection.confidence * 100).toFixed(0)}%
                          confidence)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              {forecast.riskFactors.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    Risk Factors
                  </h4>
                  <ul className="space-y-1">
                    {forecast.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {forecast.recommendations.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {forecast.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Vendor Comparisons */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vendor Comparisons</h3>

              {vendorComparisons.map((vendor) => (
                <div key={vendor.vendorId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{vendor.vendorName}</p>
                      <p className="text-sm text-gray-600">
                        {vendor.transactionCount} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(vendor.totalSpent)}
                      </p>
                      <p
                        className={cn(
                          'text-sm',
                          vendor.priceComparisonPercent > 0
                            ? 'text-red-600'
                            : 'text-green-600',
                        )}
                      >
                        {vendor.priceComparisonPercent > 0 ? 'Above' : 'Below'}{' '}
                        market avg by{' '}
                        {Math.abs(vendor.priceComparisonPercent).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {vendor.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < Math.floor(vendor.rating!)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        ({vendor.rating.toFixed(1)})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Savings Opportunities */}
          {activeTab === 'savings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Savings Opportunities</h3>

              {savingsOpportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className={cn(
                    'p-4 rounded-lg border-l-4',
                    opportunity.priority === 'high'
                      ? 'border-red-500 bg-red-50'
                      : opportunity.priority === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-green-500 bg-green-50',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <p className="font-medium">{opportunity.title}</p>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {opportunity.description}
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        Action: {opportunity.actionRequired}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(opportunity.potentialSavings)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(opportunity.confidence * 100).toFixed(0)}% confidence
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {savingsOpportunities.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No savings opportunities identified at this time
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Upcoming Payment Reminders
          </h3>

          <div className="space-y-2">
            {upcomingReminders.slice(0, 5).map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{reminder.vendorName}</p>
                    <p className="text-sm text-gray-600">
                      Due{' '}
                      {formatDistanceToNow(reminder.dueDate, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(reminder.amount)}</p>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      reminder.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : reminder.status === 'sent'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700',
                    )}
                  >
                    {reminder.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Connection Modal */}
      {showBankConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Connect Your Bank Account
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Securely connect your bank account to automatically track wedding
              expenses and categorize transactions.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Read-only access</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Bank-level encryption</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Automatic categorization</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConnectBank}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Connect Bank
              </button>
              <button
                onClick={() => setShowBankConnect(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Scanned Receipt */}
      {lastScannedReceipt && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Last Scanned Receipt
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vendor</p>
              <p className="font-medium">{lastScannedReceipt.vendor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-medium">
                {formatCurrency(lastScannedReceipt.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium">{lastScannedReceipt.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Confidence</p>
              <p className="font-medium">
                {(lastScannedReceipt.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
