'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit3,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  Settings,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Eye,
  EyeOff,
  BarChart3,
  Filter,
  Search,
  Book,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  expenseCategorizer,
  CategorizationResult,
  TransactionContext,
  CategoryRule,
} from '@/lib/services/expense-categorizer';

interface ExpenseCategorizationManagerProps {
  clientId: string;
  className?: string;
  onCategoryUpdate?: (transactionId: string, category: string) => void;
}

interface PendingCategorization {
  transaction: TransactionContext;
  result: CategorizationResult;
  status: 'pending' | 'approved' | 'corrected' | 'dismissed';
  user_category?: string;
  correction_reason?: string;
}

interface CategorizationStats {
  total_processed: number;
  auto_categorized: number;
  user_corrected: number;
  accuracy_rate: number;
  most_common_categories: Array<{ category: string; count: number }>;
  recent_improvements: string[];
}

export function ExpenseCategorizationManager({
  clientId,
  className,
  onCategoryUpdate,
}: ExpenseCategorizationManagerProps) {
  // State
  const [pendingCategorizations, setPendingCategorizations] = useState<
    PendingCategorization[]
  >([]);
  const [stats, setStats] = useState<CategorizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'pending' | 'low_confidence' | 'corrections'
  >('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(0.9);
  const [enableLearning, setEnableLearning] = useState(true);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Load data
  useEffect(() => {
    loadPendingCategorizations();
    loadStats();
  }, [clientId]);

  const loadPendingCategorizations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/budget/categorization/pending?client_id=${clientId}`,
      );
      if (!response.ok) throw new Error('Failed to load categorizations');

      const data = await response.json();
      setPendingCategorizations(data.categorizations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load categorizations',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(
        `/api/budget/categorization/stats?client_id=${clientId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const categorizeBulkTransactions = async () => {
    setProcessingBulk(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/categorization/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          auto_approve_threshold: autoApproveThreshold,
        }),
      });

      if (!response.ok)
        throw new Error('Failed to process bulk categorization');

      await loadPendingCategorizations();
      await loadStats();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process bulk categorization',
      );
    } finally {
      setProcessingBulk(false);
    }
  };

  const approveCategorization = async (index: number) => {
    const categorization = pendingCategorizations[index];

    try {
      const response = await fetch('/api/budget/categorization/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: categorization.transaction.id,
          category: categorization.result.category,
          client_id: clientId,
        }),
      });

      if (!response.ok) throw new Error('Failed to approve categorization');

      // Update local state
      const updated = [...pendingCategorizations];
      updated[index].status = 'approved';
      setPendingCategorizations(updated);

      onCategoryUpdate?.(
        categorization.transaction.id!,
        categorization.result.category,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve categorization',
      );
    }
  };

  const correctCategorization = async (
    index: number,
    newCategory: string,
    reason?: string,
  ) => {
    const categorization = pendingCategorizations[index];

    try {
      const response = await fetch('/api/budget/categorization/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: categorization.transaction.id,
          original_category: categorization.result.category,
          corrected_category: newCategory,
          reason,
          client_id: clientId,
          enable_learning: enableLearning,
        }),
      });

      if (!response.ok) throw new Error('Failed to correct categorization');

      // Update local state
      const updated = [...pendingCategorizations];
      updated[index].status = 'corrected';
      updated[index].user_category = newCategory;
      updated[index].correction_reason = reason;
      setPendingCategorizations(updated);

      onCategoryUpdate?.(categorization.transaction.id!, newCategory);

      // Reload stats to show learning improvements
      await loadStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to correct categorization',
      );
    }
  };

  const dismissCategorization = async (index: number) => {
    const categorization = pendingCategorizations[index];

    try {
      const response = await fetch('/api/budget/categorization/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: categorization.transaction.id,
          client_id: clientId,
        }),
      });

      if (!response.ok) throw new Error('Failed to dismiss categorization');

      // Update local state
      const updated = [...pendingCategorizations];
      updated[index].status = 'dismissed';
      setPendingCategorizations(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to dismiss categorization',
      );
    }
  };

  const exportTrainingData = () => {
    const data = expenseCategorizer.exportTrainingData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categorization-training-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTrainingData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        expenseCategorizer.importTrainingData(data);
        loadPendingCategorizations();
        loadStats();
      } catch (error) {
        setError('Failed to import training data: Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  // Filter categorizations
  const filteredCategorizations = pendingCategorizations.filter((cat) => {
    // Apply status filter
    switch (selectedFilter) {
      case 'pending':
        if (cat.status !== 'pending') return false;
        break;
      case 'low_confidence':
        if (cat.status !== 'pending' || cat.result.confidence >= 0.7)
          return false;
        break;
      case 'corrections':
        if (cat.status !== 'corrected') return false;
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cat.transaction.description.toLowerCase().includes(query) ||
        cat.transaction.vendor_name?.toLowerCase().includes(query) ||
        cat.result.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success-600 bg-success-50';
    if (confidence >= 0.6) return 'text-warning-600 bg-warning-50';
    return 'text-error-600 bg-error-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-600" />
              AI Expense Categorization
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Automatically categorize expenses and improve accuracy over time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button
              onClick={categorizeBulkTransactions}
              disabled={processingBulk}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Zap
                className={cn('w-4 h-4', processingBulk && 'animate-spin')}
              />
              {processingBulk ? 'Processing...' : 'Auto-Categorize'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Total Processed
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {stats.total_processed}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-xs text-success-600 font-medium">
                    Accuracy Rate
                  </p>
                  <p className="text-lg font-bold text-success-900">
                    {stats.accuracy_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-warning-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-xs text-warning-600 font-medium">
                    Auto-Categorized
                  </p>
                  <p className="text-lg font-bold text-warning-900">
                    {stats.auto_categorized}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium">
                    User Corrections
                  </p>
                  <p className="text-lg font-bold text-purple-900">
                    {stats.user_corrected}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {stats.recent_improvements.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Recent AI Improvements
                </span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                {stats.recent_improvements
                  .slice(0, 3)
                  .map((improvement, index) => (
                    <li key={index}>• {improvement}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">
            Categorization Settings
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Approve Threshold
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={autoApproveThreshold}
                onChange={(e) =>
                  setAutoApproveThreshold(parseFloat(e.target.value))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative (50%)</span>
                <span className="font-medium">
                  {(autoApproveThreshold * 100).toFixed(0)}%
                </span>
                <span>Aggressive (100%)</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable_learning"
                  checked={enableLearning}
                  onChange={(e) => setEnableLearning(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label
                  htmlFor="enable_learning"
                  className="text-sm text-gray-700"
                >
                  Enable AI learning from corrections
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportTrainingData}
                  className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Training Data
                </button>

                <label className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import Training Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTrainingData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'pending', label: 'Pending Review' },
                { key: 'low_confidence', label: 'Low Confidence' },
                { key: 'corrections', label: 'Corrections' },
                { key: 'all', label: 'All' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as any)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    selectedFilter === filter.key
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Categorizations List */}
      <div className="p-6">
        {filteredCategorizations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Brain className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No categorizations found</p>
            <p className="text-sm text-gray-400">
              {selectedFilter === 'pending'
                ? 'All transactions have been categorized'
                : 'Try adjusting your filters or process new transactions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategorizations.map((categorization, index) => (
              <CategorizationCard
                key={categorization.transaction.id || index}
                categorization={categorization}
                onApprove={() => approveCategorization(index)}
                onCorrect={(newCategory, reason) =>
                  correctCategorization(index, newCategory, reason)
                }
                onDismiss={() => dismissCategorization(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual categorization card component
interface CategorizationCardProps {
  categorization: PendingCategorization;
  onApprove: () => void;
  onCorrect: (newCategory: string, reason?: string) => void;
  onDismiss: () => void;
}

function CategorizationCard({
  categorization,
  onApprove,
  onCorrect,
  onDismiss,
}: CategorizationCardProps) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const { transaction, result, status } = categorization;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success-600 bg-success-50';
    if (confidence >= 0.6) return 'text-warning-600 bg-warning-50';
    return 'text-error-600 bg-error-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCorrect = () => {
    if (newCategory) {
      onCorrect(newCategory, correctionReason || undefined);
      setShowCorrection(false);
      setNewCategory('');
      setCorrectionReason('');
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        status === 'approved'
          ? 'border-success-200 bg-success-50'
          : status === 'corrected'
            ? 'border-warning-200 bg-warning-50'
            : status === 'dismissed'
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-200 hover:bg-gray-50',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">
                {transaction.vendor_name || 'Unknown Vendor'}
              </h4>
              <p className="text-sm text-gray-600">{transaction.description}</p>
            </div>

            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatCurrency(transaction.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {transaction.date &&
                  new Date(transaction.date).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                getConfidenceColor(result.confidence),
              )}
            >
              {getConfidenceIcon(result.confidence)}
              <span className="capitalize">{result.category}</span>
              <span>({(result.confidence * 100).toFixed(0)}%)</span>
            </div>

            {status !== 'pending' && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  status === 'approved'
                    ? 'text-success-700 bg-success-100'
                    : status === 'corrected'
                      ? 'text-warning-700 bg-warning-100'
                      : 'text-gray-700 bg-gray-100',
                )}
              >
                {status === 'approved' && <CheckCircle className="w-3 h-3" />}
                {status === 'corrected' && <Edit3 className="w-3 h-3" />}
                {status === 'dismissed' && <XCircle className="w-3 h-3" />}
                <span className="capitalize">{status}</span>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-3">
            <strong>AI Reasoning:</strong> {result.reasoning}
          </div>

          {result.alternative_categories.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Alternative Categories:
              </p>
              <div className="flex flex-wrap gap-1">
                {result.alternative_categories.slice(0, 3).map((alt, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {alt.category} ({(alt.confidence * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {status === 'corrected' && categorization.user_category && (
            <div className="p-2 bg-blue-50 rounded text-sm">
              <p>
                <strong>Corrected to:</strong> {categorization.user_category}
              </p>
              {categorization.correction_reason && (
                <p>
                  <strong>Reason:</strong> {categorization.correction_reason}
                </p>
              )}
            </div>
          )}
        </div>

        {status === 'pending' && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onApprove}
              className="p-2 text-success-600 hover:bg-success-50 rounded-md transition-colors"
              title="Approve categorization"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowCorrection(!showCorrection)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Correct categorization"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={onDismiss}
              className="p-2 text-error-600 hover:bg-error-50 rounded-md transition-colors"
              title="Dismiss"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Correction Form */}
      {showCorrection && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">
            Correct Categorization
          </h5>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select category...</option>
                <option value="venue">Venue</option>
                <option value="catering">Catering</option>
                <option value="photography">Photography</option>
                <option value="videography">Videography</option>
                <option value="flowers">Flowers & Decor</option>
                <option value="music">Music & Entertainment</option>
                <option value="attire">Attire</option>
                <option value="transportation">Transportation</option>
                <option value="stationery">Stationery</option>
                <option value="beauty">Beauty & Wellness</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Correction{' '}
                <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                placeholder="Help the AI learn by explaining why this correction is better..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCorrect}
                disabled={!newCategory}
                className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Apply Correction
              </button>
              <button
                onClick={() => setShowCorrection(false)}
                className="px-3 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
