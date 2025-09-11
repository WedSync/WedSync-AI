'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Settings,
  Filter,
  Download,
  RefreshCw,
  Target,
  BarChart3,
  LineChart as LineChartIcon,
  Zap,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Scatter,
  ScatterChart,
  Cell,
} from 'recharts';
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  subMonths,
  isBefore,
  isAfter,
} from 'date-fns';

interface CashFlowProjectionProps {
  clientId: string;
  className?: string;
  timeRange?: 'next3months' | 'next6months' | 'next12months' | 'untilwedding';
  weddingDate?: Date;
}

interface CashFlowDataPoint {
  date: Date;
  period: string;
  // Incoming
  income: number;
  deposits_received: number;
  refunds: number;
  // Outgoing
  scheduled_payments: number;
  predicted_expenses: number;
  contingency_reserve: number;
  // Calculated
  net_flow: number;
  cumulative_flow: number;
  available_balance: number;
  // Projections
  optimistic_scenario: number;
  realistic_scenario: number;
  pessimistic_scenario: number;
  // Analysis
  cash_shortage_risk: number;
  payment_concentration: number;
  seasonal_adjustment: number;
}

interface CashFlowInsight {
  type: 'warning' | 'opportunity' | 'milestone' | 'info';
  title: string;
  description: string;
  date: Date;
  impact: number;
  actionable: boolean;
  recommendation?: string;
}

interface PaymentEvent {
  id: string;
  vendor_name: string;
  amount: number;
  due_date: Date;
  category: string;
  payment_type: 'deposit' | 'milestone' | 'final' | 'installment';
  probability: number;
  is_confirmed: boolean;
}

interface SeasonalFactor {
  month: number;
  expense_multiplier: number;
  vendor_availability: 'high' | 'medium' | 'low';
  price_level: 'low' | 'medium' | 'high' | 'peak';
  typical_payment_timing: 'early' | 'mid' | 'late';
}

const SEASONAL_FACTORS: SeasonalFactor[] = [
  {
    month: 0,
    expense_multiplier: 0.7,
    vendor_availability: 'high',
    price_level: 'low',
    typical_payment_timing: 'mid',
  }, // Jan
  {
    month: 1,
    expense_multiplier: 0.8,
    vendor_availability: 'high',
    price_level: 'low',
    typical_payment_timing: 'mid',
  }, // Feb
  {
    month: 2,
    expense_multiplier: 0.9,
    vendor_availability: 'high',
    price_level: 'medium',
    typical_payment_timing: 'early',
  }, // Mar
  {
    month: 3,
    expense_multiplier: 1.1,
    vendor_availability: 'medium',
    price_level: 'medium',
    typical_payment_timing: 'early',
  }, // Apr
  {
    month: 4,
    expense_multiplier: 1.3,
    vendor_availability: 'medium',
    price_level: 'high',
    typical_payment_timing: 'early',
  }, // May
  {
    month: 5,
    expense_multiplier: 1.4,
    vendor_availability: 'low',
    price_level: 'peak',
    typical_payment_timing: 'early',
  }, // Jun
  {
    month: 6,
    expense_multiplier: 1.3,
    vendor_availability: 'low',
    price_level: 'peak',
    typical_payment_timing: 'mid',
  }, // Jul
  {
    month: 7,
    expense_multiplier: 1.2,
    vendor_availability: 'low',
    price_level: 'high',
    typical_payment_timing: 'mid',
  }, // Aug
  {
    month: 8,
    expense_multiplier: 1.3,
    vendor_availability: 'medium',
    price_level: 'high',
    typical_payment_timing: 'early',
  }, // Sep
  {
    month: 9,
    expense_multiplier: 1.2,
    vendor_availability: 'medium',
    price_level: 'high',
    typical_payment_timing: 'early',
  }, // Oct
  {
    month: 10,
    expense_multiplier: 0.9,
    vendor_availability: 'high',
    price_level: 'medium',
    typical_payment_timing: 'late',
  }, // Nov
  {
    month: 11,
    expense_multiplier: 0.8,
    vendor_availability: 'high',
    price_level: 'low',
    typical_payment_timing: 'late',
  }, // Dec
];

const CHART_COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280',
  income: '#3B82F6',
  expenses: '#F59E0B',
  balance: '#8B5CF6',
  optimistic: '#84CC16',
  realistic: '#6366F1',
  pessimistic: '#DC2626',
};

export function CashFlowProjection({
  clientId,
  className,
  timeRange = 'next6months',
  weddingDate,
}: CashFlowProjectionProps) {
  // State
  const [cashFlowData, setCashFlowData] = useState<CashFlowDataPoint[]>([]);
  const [insights, setInsights] = useState<CashFlowInsight[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<
    'optimistic' | 'realistic' | 'pessimistic'
  >('realistic');
  const [showScenarios, setShowScenarios] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [viewType, setViewType] = useState<'area' | 'line' | 'bar'>('area');
  const [refreshing, setRefreshing] = useState(false);

  // Load cash flow data
  useEffect(() => {
    loadCashFlowProjection();
  }, [clientId, timeRange, weddingDate]);

  const loadCashFlowProjection = async () => {
    setLoading(true);
    setError(null);

    try {
      const [cashFlowRes, eventsRes] = await Promise.all([
        fetch(
          `/api/budget/cashflow?client_id=${clientId}&time_range=${timeRange}&wedding_date=${weddingDate?.toISOString()}`,
        ),
        fetch(
          `/api/budget/payment-events?client_id=${clientId}&time_range=${timeRange}`,
        ),
      ]);

      if (!cashFlowRes.ok || !eventsRes.ok) {
        throw new Error('Failed to load cash flow data');
      }

      const [cashFlowData, eventsData] = await Promise.all([
        cashFlowRes.json(),
        eventsRes.json(),
      ]);

      setCashFlowData(
        cashFlowData.projection.map((p: any) => ({
          ...p,
          date: new Date(p.date),
        })),
      );

      setPaymentEvents(
        eventsData.events.map((e: any) => ({
          ...e,
          due_date: new Date(e.due_date),
        })),
      );

      setInsights(
        cashFlowData.insights.map((i: any) => ({
          ...i,
          date: new Date(i.date),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load cash flow projection',
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshProjection = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/budget/cashflow/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      await loadCashFlowProjection();
    } catch (err) {
      setError('Failed to refresh projection');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (cashFlowData.length === 0) return null;

    const finalBalance =
      cashFlowData[cashFlowData.length - 1]?.available_balance || 0;
    const minBalance = Math.min(
      ...cashFlowData.map((d) => d.available_balance),
    );
    const maxBalance = Math.max(
      ...cashFlowData.map((d) => d.available_balance),
    );
    const totalInflow = cashFlowData.reduce(
      (sum, d) => sum + d.income + d.deposits_received + d.refunds,
      0,
    );
    const totalOutflow = cashFlowData.reduce(
      (sum, d) => sum + d.scheduled_payments + d.predicted_expenses,
      0,
    );
    const netFlow = totalInflow - totalOutflow;

    const riskPeriods = cashFlowData.filter(
      (d) => d.available_balance < 1000,
    ).length;
    const shortfallRisk = riskPeriods / cashFlowData.length;

    const upcomingPayments = paymentEvents
      .filter(
        (e) =>
          isBefore(new Date(), e.due_date) &&
          isBefore(e.due_date, addDays(new Date(), 30)),
      )
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      finalBalance,
      minBalance,
      maxBalance,
      totalInflow,
      totalOutflow,
      netFlow,
      shortfallRisk,
      upcomingPayments,
      averageMonthlyFlow: netFlow / Math.max(1, cashFlowData.length / 4), // Approximate months
    };
  }, [cashFlowData, paymentEvents]);

  // Prepare chart data based on selected scenario
  const chartData = useMemo(() => {
    return cashFlowData.map((point) => ({
      ...point,
      period: format(point.date, 'MMM yyyy'),
      scenario_value: point[`${selectedScenario}_scenario`],
      net_flow_display: point.net_flow,
      balance_display: point.available_balance,
    }));
  }, [cashFlowData, selectedScenario]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInsightIcon = (type: CashFlowInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-600" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4 text-success-600" />;
      case 'milestone':
        return <Target className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getInsightColor = (type: CashFlowInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'border-warning-200 bg-warning-50';
      case 'opportunity':
        return 'border-success-200 bg-success-50';
      case 'milestone':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
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
            <h3 className="text-lg font-semibold text-gray-900">
              Cash Flow Projection
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Track your wedding budget cash flow and plan for upcoming expenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['area', 'line', 'bar'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                    viewType === type
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              onClick={refreshProjection}
              disabled={refreshing}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={cn('w-4 h-4', refreshing && 'animate-spin')}
              />
              Refresh
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

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Projected Balance
                  </p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      summaryStats.finalBalance >= 0
                        ? 'text-blue-900'
                        : 'text-error-600',
                    )}
                  >
                    {formatCurrency(summaryStats.finalBalance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-xs text-success-600 font-medium">
                    Total Inflow
                  </p>
                  <p className="text-lg font-bold text-success-900">
                    {formatCurrency(summaryStats.totalInflow)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-warning-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-xs text-warning-600 font-medium">
                    Total Outflow
                  </p>
                  <p className="text-lg font-bold text-warning-900">
                    {formatCurrency(summaryStats.totalOutflow)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'rounded-lg p-4',
                summaryStats.shortfallRisk > 0.3 ? 'bg-error-50' : 'bg-gray-50',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    summaryStats.shortfallRisk > 0.3
                      ? 'bg-error-100'
                      : 'bg-gray-100',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'w-5 h-5',
                      summaryStats.shortfallRisk > 0.3
                        ? 'text-error-600'
                        : 'text-gray-600',
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      summaryStats.shortfallRisk > 0.3
                        ? 'text-error-600'
                        : 'text-gray-600',
                    )}
                  >
                    Cash Shortage Risk
                  </p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      summaryStats.shortfallRisk > 0.3
                        ? 'text-error-900'
                        : 'text-gray-900',
                    )}
                  >
                    {(summaryStats.shortfallRisk * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {summaryStats.upcomingPayments > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  <strong>
                    {formatCurrency(summaryStats.upcomingPayments)}
                  </strong>{' '}
                  in payments due in the next 30 days
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Scenario:
              </span>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="optimistic">Optimistic</option>
                <option value="realistic">Realistic</option>
                <option value="pessimistic">Pessimistic</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showScenarios ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                Scenario Bands
              </button>

              <button
                onClick={() => setShowEvents(!showEvents)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showEvents ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                Payment Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="p-6">
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'area' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {showScenarios && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="optimistic_scenario"
                      stackId="scenarios"
                      stroke={CHART_COLORS.optimistic}
                      fill={CHART_COLORS.optimistic}
                      fillOpacity={0.1}
                      name="Optimistic Range"
                    />
                    <Area
                      type="monotone"
                      dataKey="pessimistic_scenario"
                      stackId="scenarios"
                      stroke={CHART_COLORS.pessimistic}
                      fill={CHART_COLORS.pessimistic}
                      fillOpacity={0.1}
                      name="Pessimistic Range"
                    />
                  </>
                )}

                <Line
                  type="monotone"
                  dataKey="balance_display"
                  stroke={CHART_COLORS.balance}
                  strokeWidth={3}
                  name="Available Balance"
                  dot={{ fill: CHART_COLORS.balance, strokeWidth: 2, r: 4 }}
                />

                <Line
                  type="monotone"
                  dataKey="scenario_value"
                  stroke={CHART_COLORS.realistic}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name={`${selectedScenario.charAt(0).toUpperCase() + selectedScenario.slice(1)} Scenario`}
                />

                <ReferenceLine
                  y={0}
                  stroke="#dc2626"
                  strokeDasharray="3 3"
                  label="Break Even"
                />
              </ComposedChart>
            ) : viewType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.income}
                  strokeWidth={2}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="scheduled_payments"
                  stroke={CHART_COLORS.expenses}
                  strokeWidth={2}
                  name="Scheduled Payments"
                />
                <Line
                  type="monotone"
                  dataKey="net_flow_display"
                  stroke={CHART_COLORS.neutral}
                  strokeWidth={3}
                  name="Net Cash Flow"
                />

                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar
                  dataKey="income"
                  fill={CHART_COLORS.income}
                  name="Income"
                />
                <Bar
                  dataKey="scheduled_payments"
                  fill={CHART_COLORS.expenses}
                  name="Scheduled Payments"
                />
                <Bar
                  dataKey="predicted_expenses"
                  fill={CHART_COLORS.warning}
                  name="Predicted Expenses"
                />

                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Upcoming Payment Events */}
        {showEvents && paymentEvents.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Upcoming Payment Events
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paymentEvents.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 text-sm">
                      {event.vendor_name}
                    </h5>
                    <div
                      className={cn(
                        'px-2 py-1 rounded text-xs',
                        event.is_confirmed
                          ? 'bg-success-100 text-success-700'
                          : 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {event.is_confirmed ? 'Confirmed' : 'Estimated'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(event.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due:</span>
                      <span>{format(event.due_date, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="capitalize">{event.category}</span>
                    </div>
                    {!event.is_confirmed && (
                      <div className="flex justify-between">
                        <span>Probability:</span>
                        <span>{(event.probability * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cash Flow Insights */}
        {insights.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Cash Flow Insights
            </h4>
            <div className="space-y-3">
              {insights.slice(0, 5).map((insight, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border',
                    getInsightColor(insight.type),
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {insight.title}
                      </h5>
                      <p className="text-sm text-gray-700 mt-1">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {format(insight.date, 'MMM dd, yyyy')}
                        </span>
                        {insight.impact !== 0 && (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              insight.impact > 0
                                ? 'text-success-600'
                                : 'text-error-600',
                            )}
                          >
                            {insight.impact > 0 ? '+' : ''}
                            {formatCurrency(insight.impact)}
                          </span>
                        )}
                      </div>
                      {insight.recommendation && (
                        <p className="text-xs text-gray-600 mt-2 font-medium">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
