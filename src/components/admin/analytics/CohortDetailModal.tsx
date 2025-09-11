'use client';

import React, { useMemo } from 'react';
import {
  X,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Award,
  AlertCircle,
} from 'lucide-react';
import { CohortData, CohortDetailMetrics } from '@/types/cohort-analysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface CohortDetailModalProps {
  cohort: CohortData;
  detailMetrics: CohortDetailMetrics;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const CohortDetailModal: React.FC<CohortDetailModalProps> = ({
  cohort,
  detailMetrics,
  isOpen,
  onClose,
  className = '',
}) => {
  // Transform retention curve data for chart
  const retentionChartData = useMemo(() => {
    return detailMetrics.retention_curve.map((point, index) => ({
      month: `Month ${point.month}`,
      retention: point.retention_percentage,
      revenue: point.revenue_per_supplier / 1000, // Convert to thousands
    }));
  }, [detailMetrics.retention_curve]);

  // Transform supplier status data for chart
  const statusChartData = useMemo(() => {
    const statusCounts = detailMetrics.individual_suppliers.reduce(
      (acc, supplier) => {
        acc[supplier.current_status] = (acc[supplier.current_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count,
      percentage: (
        (count / detailMetrics.individual_suppliers.length) *
        100
      ).toFixed(1),
    }));
  }, [detailMetrics.individual_suppliers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-success-700 bg-success-100';
      case 'churned':
        return 'text-error-700 bg-error-100';
      case 'at_risk':
        return 'text-warning-700 bg-warning-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`
        bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl
        ${className}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Cohort Deep Dive:{' '}
              {new Date(cohort.cohort_start).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {cohort.cohort_size.toLocaleString()} suppliers •{' '}
              {cohort.months_tracked} months tracked
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-medium">
                    Cohort Size
                  </p>
                  <p className="text-2xl font-bold text-primary-900">
                    {cohort.cohort_size.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-success-50 rounded-lg p-4 border border-success-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success-700 font-medium">
                    Current Retention
                  </p>
                  <p className="text-2xl font-bold text-success-900">
                    {(
                      cohort.retention_rates[
                        cohort.retention_rates.length - 1
                      ] * 100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <Target className="w-8 h-8 text-success-600" />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">
                    Lifetime Value
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(cohort.ltv_calculated)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-warning-50 rounded-lg p-4 border border-warning-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-warning-700 font-medium">
                    Total Revenue
                  </p>
                  <p className="text-xl font-bold text-warning-900">
                    {formatCurrency(
                      cohort.revenue_progression.reduce(
                        (sum, rev) => sum + rev,
                        0,
                      ),
                    )}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-warning-600" />
              </div>
            </div>
          </div>

          {/* Benchmark Comparison */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-xs">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-primary-600" />
              Performance Benchmarks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">vs Average</p>
                <div className="flex items-center justify-center">
                  {detailMetrics.benchmark_comparison.vs_average_retention >
                  0 ? (
                    <TrendingUp className="w-5 h-5 text-success-600 mr-2" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-error-600 mr-2" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      detailMetrics.benchmark_comparison.vs_average_retention >
                      0
                        ? 'text-success-900'
                        : 'text-error-900'
                    }`}
                  >
                    {detailMetrics.benchmark_comparison.vs_average_retention > 0
                      ? '+'
                      : ''}
                    {(
                      detailMetrics.benchmark_comparison.vs_average_retention *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">vs Previous Cohort</p>
                <div className="flex items-center justify-center">
                  {detailMetrics.benchmark_comparison.vs_previous_cohort > 0 ? (
                    <TrendingUp className="w-5 h-5 text-success-600 mr-2" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-error-600 mr-2" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      detailMetrics.benchmark_comparison.vs_previous_cohort > 0
                        ? 'text-success-900'
                        : 'text-error-900'
                    }`}
                  >
                    {detailMetrics.benchmark_comparison.vs_previous_cohort > 0
                      ? '+'
                      : ''}
                    {(
                      detailMetrics.benchmark_comparison.vs_previous_cohort *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Performance Percentile
                </p>
                <div className="flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600 mr-2" />
                  <span className="text-lg font-bold text-primary-900">
                    {detailMetrics.benchmark_comparison.performance_percentile}
                    th
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Retention Curve Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <h4 className="text-base font-semibold text-gray-900 mb-4">
                Retention & Revenue Curve
              </h4>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={retentionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="retention"
                    stroke="#9E77ED"
                    strokeWidth={3}
                    name="Retention %"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#12B76A"
                    strokeWidth={2}
                    name="Revenue ($k)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Supplier Status Distribution */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <h4 className="text-base font-semibold text-gray-900 mb-4">
                Supplier Status Distribution
              </h4>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#9E77ED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Suppliers Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary-600" />
              Individual Suppliers ({detailMetrics.individual_suppliers.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Supplier ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Signup Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Category
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">
                      Retention Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailMetrics.individual_suppliers
                    .slice(0, 10)
                    .map((supplier) => (
                      <tr
                        key={supplier.supplier_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900 font-mono text-xs">
                          {supplier.supplier_id}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {new Date(supplier.signup_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${getStatusColor(supplier.current_status)}
                        `}
                          >
                            {supplier.current_status
                              .replace('_', ' ')
                              .toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 capitalize">
                          {supplier.category}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 font-medium">
                          {formatCurrency(supplier.revenue_contribution)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{
                                  width: `${supplier.retention_score * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-gray-900 font-medium">
                              {(supplier.retention_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {detailMetrics.individual_suppliers.length > 10 && (
                <div className="pt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Showing 10 of {detailMetrics.individual_suppliers.length}{' '}
                    suppliers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CohortDetailModal;
