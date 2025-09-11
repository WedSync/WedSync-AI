'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  Download,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

import type {
  VendorPerformanceMetrics,
  ChartConfig,
  ChartDataPoint,
} from '../../types/analytics';

export interface PerformanceChartsProps {
  data: VendorPerformanceMetrics[];
  type:
    | 'responseTime'
    | 'bookingSuccess'
    | 'satisfaction'
    | 'comprehensive'
    | 'custom';
  title: string;
  interactive?: boolean;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  className?: string;
}

// Color schemes for different chart types
const colorSchemes = {
  primary: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A'],
  success: ['#10B981', '#059669', '#047857', '#065F46'],
  warning: ['#F59E0B', '#D97706', '#B45309', '#92400E'],
  danger: ['#EF4444', '#DC2626', '#B91C1C', '#991B1B'],
  purple: ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
  gradient: [
    { offset: '0%', color: '#3B82F6' },
    { offset: '100%', color: '#1D4ED8' },
  ],
};

// Utility function for class names
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
            {entry.unit && ` ${entry.unit}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Format numbers for display
const formatValue = (value: number, type: string): string => {
  switch (type) {
    case 'percentage':
      return `${Math.round(value * 100)}%`;
    case 'currency':
      return `£${value.toLocaleString()}`;
    case 'time':
      return `${value}min`;
    case 'rating':
      return value.toFixed(1);
    default:
      return value.toLocaleString();
  }
};

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  data,
  type,
  title,
  interactive = false,
  height = 400,
  showLegend = true,
  showGrid = true,
  className,
}) => {
  const [chartType, setChartType] = useState<
    'bar' | 'line' | 'area' | 'pie' | 'scatter'
  >('bar');
  const [selectedMetric, setSelectedMetric] = useState<string>(
    'responseTimeMinutes',
  );
  const [sortBy, setSortBy] = useState<'name' | 'value'>('value');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Process data based on chart type
  const chartData = useMemo(() => {
    switch (type) {
      case 'responseTime':
        return data
          .filter((vendor) => vendor.responseTimeMinutes > 0)
          .map((vendor) => ({
            name:
              vendor.vendorName.substring(0, 12) +
              (vendor.vendorName.length > 12 ? '...' : ''),
            fullName: vendor.vendorName,
            value: vendor.responseTimeMinutes,
            type: vendor.vendorType,
            fill:
              vendor.responseTimeMinutes < 60
                ? '#10B981'
                : vendor.responseTimeMinutes < 120
                  ? '#F59E0B'
                  : '#EF4444',
          }));

      case 'bookingSuccess':
        return data
          .filter((vendor) => vendor.bookingSuccessRate >= 0)
          .map((vendor) => ({
            name:
              vendor.vendorName.substring(0, 12) +
              (vendor.vendorName.length > 12 ? '...' : ''),
            fullName: vendor.vendorName,
            value: Math.round(vendor.bookingSuccessRate * 100),
            type: vendor.vendorType,
            fill:
              vendor.bookingSuccessRate > 0.8
                ? '#10B981'
                : vendor.bookingSuccessRate > 0.6
                  ? '#F59E0B'
                  : '#EF4444',
          }));

      case 'satisfaction':
        return data
          .filter((vendor) => vendor.customerSatisfactionScore > 0)
          .map((vendor) => ({
            name:
              vendor.vendorName.substring(0, 12) +
              (vendor.vendorName.length > 12 ? '...' : ''),
            fullName: vendor.vendorName,
            value: vendor.customerSatisfactionScore,
            type: vendor.vendorType,
            fill:
              vendor.customerSatisfactionScore > 4.5
                ? '#10B981'
                : vendor.customerSatisfactionScore > 3.5
                  ? '#F59E0B'
                  : '#EF4444',
          }));

      case 'comprehensive':
        return data.map((vendor) => ({
          name: vendor.vendorName.substring(0, 10) + '...',
          fullName: vendor.vendorName,
          responseTime: vendor.responseTimeMinutes,
          bookingRate: Math.round(vendor.bookingSuccessRate * 100),
          satisfaction: vendor.customerSatisfactionScore,
          totalBookings: vendor.totalBookings,
          revenue: vendor.totalRevenue,
          reliability: vendor.reliabilityScore,
          type: vendor.vendorType,
        }));

      default:
        return data.map((vendor) => ({
          name: vendor.vendorName,
          value: vendor[
            selectedMetric as keyof VendorPerformanceMetrics
          ] as number,
          type: vendor.vendorType,
        }));
    }
  }, [data, type, selectedMetric]);

  // Sort data
  const sortedData = useMemo(() => {
    if (sortBy === 'name') {
      return [...chartData].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...chartData].sort((a, b) => {
      const aValue = 'value' in a ? a.value : 0;
      const bValue = 'value' in b ? b.value : 0;
      return typeof aValue === 'number' && typeof bValue === 'number'
        ? bValue - aValue
        : 0;
    });
  }, [chartData, sortBy]);

  // Render chart based on type
  const renderChart = useCallback(() => {
    const commonProps = {
      data: sortedData.slice(0, 20), // Limit to top 20 for readability
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Bar
              dataKey="value"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill || colorSchemes.primary[index % 4]}
                />
              ))}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        );

      case 'pie':
        const pieData = sortedData.slice(0, 8).map((item, index) => ({
          ...item,
          fill: colorSchemes.primary[index % colorSchemes.primary.length],
        }));

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      case 'scatter':
        if (type === 'comprehensive') {
          return (
            <ScatterChart {...commonProps}>
              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              )}
              <XAxis
                type="number"
                dataKey="bookingRate"
                name="Booking Success Rate"
                unit="%"
                fontSize={12}
              />
              <YAxis
                type="number"
                dataKey="satisfaction"
                name="Customer Satisfaction"
                unit="/5"
                fontSize={12}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={<CustomTooltip />}
              />
              <Scatter name="Vendors" data={sortedData} fill="#3B82F6" />
            </ScatterChart>
          );
        }
        return null;

      default:
        return null;
    }
  }, [chartType, sortedData, showGrid, showLegend, type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-6',
        isFullscreen && 'fixed inset-4 z-50',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chart Type Selector */}
          {interactive && (
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
              {type === 'comprehensive' && (
                <option value="scatter">Scatter Plot</option>
              )}
            </select>
          )}

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="value">Sort by Value</option>
            <option value="name">Sort by Name</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div
        className="w-full"
        style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Statistics */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-medium text-gray-900">{sortedData.length}</div>
          <div className="text-gray-600">Vendors</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="font-medium text-blue-900">
            {type === 'responseTime' &&
              `${Math.round(sortedData.reduce((sum, item) => sum + ('value' in item ? (item.value as number) : 0), 0) / sortedData.length)}min`}
            {type === 'bookingSuccess' &&
              `${Math.round(sortedData.reduce((sum, item) => sum + ('value' in item ? (item.value as number) : 0), 0) / sortedData.length)}%`}
            {type === 'satisfaction' &&
              `${(sortedData.reduce((sum, item) => sum + ('value' in item ? (item.value as number) : 0), 0) / sortedData.length).toFixed(1)}/5`}
          </div>
          <div className="text-blue-600">Average</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-medium text-green-900">
            {
              sortedData.filter((item) =>
                type === 'responseTime'
                  ? ('value' in item ? (item.value as number) : 0) < 60
                  : type === 'bookingSuccess'
                    ? ('value' in item ? (item.value as number) : 0) > 80
                    : type === 'satisfaction'
                      ? ('value' in item ? (item.value as number) : 0) > 4.0
                      : false,
              ).length
            }
          </div>
          <div className="text-green-600">
            {type === 'responseTime' && 'Fast (<1h)'}
            {type === 'bookingSuccess' && 'High (>80%)'}
            {type === 'satisfaction' && 'Excellent (>4.0)'}
          </div>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded">
          <div className="font-medium text-orange-900">
            {
              sortedData.filter((item) =>
                type === 'responseTime'
                  ? ('value' in item ? (item.value as number) : 0) > 240
                  : type === 'bookingSuccess'
                    ? ('value' in item ? (item.value as number) : 0) < 50
                    : type === 'satisfaction'
                      ? ('value' in item ? (item.value as number) : 0) < 3.0
                      : false,
              ).length
            }
          </div>
          <div className="text-orange-600">
            {type === 'responseTime' && 'Slow (>4h)'}
            {type === 'bookingSuccess' && 'Low (<50%)'}
            {type === 'satisfaction' && 'Poor (<3.0)'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceCharts;
