'use client';

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
} from 'recharts';

interface ChartsPanelProps {
  data: any;
  loading?: boolean;
}

const COLORS = ['#7F56D9', '#9E77ED', '#B692F6', '#D6BBFB', '#E9D7FE'];

export function ChartsPanel({ data, loading }: ChartsPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  const revenueData = data?.revenueChart || [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 52000, target: 55000 },
    { month: 'Mar', revenue: 61000, target: 60000 },
    { month: 'Apr', revenue: 75000, target: 70000 },
    { month: 'May', revenue: 95000, target: 85000 },
    { month: 'Jun', revenue: 110000, target: 95000 },
    { month: 'Jul', revenue: 125000, target: 105000 },
    { month: 'Aug', revenue: 135000, target: 115000 },
    { month: 'Sep', revenue: 120000, target: 110000 },
    { month: 'Oct', revenue: 85000, target: 80000 },
    { month: 'Nov', revenue: 65000, target: 70000 },
    { month: 'Dec', revenue: 70000, target: 75000 },
  ];

  const clientAcquisitionData = data?.clientChart || [
    { month: 'Jan', newClients: 12, activeClients: 145 },
    { month: 'Feb', newClients: 18, activeClients: 160 },
    { month: 'Mar', newClients: 25, activeClients: 180 },
    { month: 'Apr', newClients: 35, activeClients: 210 },
    { month: 'May', newClients: 48, activeClients: 250 },
    { month: 'Jun', newClients: 52, activeClients: 295 },
    { month: 'Jul', newClients: 58, activeClients: 340 },
    { month: 'Aug', newClients: 61, activeClients: 385 },
    { month: 'Sep', newClients: 45, activeClients: 420 },
    { month: 'Oct', newClients: 32, activeClients: 440 },
    { month: 'Nov', newClients: 28, activeClients: 455 },
    { month: 'Dec', newClients: 35, activeClients: 475 },
  ];

  const weddingTimelineData = data?.timelineChart || [
    { month: 'Jan', bookings: 15, capacity: 45 },
    { month: 'Feb', bookings: 18, capacity: 45 },
    { month: 'Mar', bookings: 22, capacity: 50 },
    { month: 'Apr', bookings: 28, capacity: 55 },
    { month: 'May', bookings: 42, capacity: 60 },
    { month: 'Jun', bookings: 48, capacity: 65 },
    { month: 'Jul', bookings: 52, capacity: 70 },
    { month: 'Aug', bookings: 55, capacity: 70 },
    { month: 'Sep', bookings: 50, capacity: 65 },
    { month: 'Oct', bookings: 35, capacity: 55 },
    { month: 'Nov', bookings: 25, capacity: 50 },
    { month: 'Dec', bookings: 20, capacity: 45 },
  ];

  const vendorPerformanceData = data?.vendorChart || [
    { name: 'Photographers', value: 35, rating: 4.8 },
    { name: 'Venues', value: 25, rating: 4.6 },
    { name: 'Caterers', value: 20, rating: 4.7 },
    { name: 'Florists', value: 15, rating: 4.5 },
    { name: 'Others', value: 5, rating: 4.4 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Trends
            </h3>
            <p className="text-sm text-gray-500">Monthly revenue vs targets</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-600 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">Actual</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-300 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">Target</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              formatter={(value: any, name) => [
                `$${value.toLocaleString()}`,
                name === 'revenue' ? 'Actual Revenue' : 'Target Revenue',
              ]}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="target"
              stackId="1"
              stroke="#D6BBFB"
              fill="#E9D7FE"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stackId="1"
              stroke="#7F56D9"
              fill="#B692F6"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Client Acquisition Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Client Growth
            </h3>
            <p className="text-sm text-gray-500">
              New acquisitions vs total active
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-600 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">New</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-300 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">Total</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientAcquisitionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name) => [
                value,
                name === 'newClients' ? 'New Clients' : 'Active Clients',
              ]}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="activeClients" fill="#E9D7FE" radius={[4, 4, 0, 0]} />
            <Bar dataKey="newClients" fill="#7F56D9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wedding Timeline Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Peak Season Analysis
            </h3>
            <p className="text-sm text-gray-500">Bookings vs system capacity</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-600 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">Bookings</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">Capacity</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weddingTimelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name) => [
                value,
                name === 'bookings' ? 'Bookings' : 'System Capacity',
              ]}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="#EF4444"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#7F56D9"
              strokeWidth={3}
              dot={{ fill: '#7F56D9', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Vendor Performance Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Vendor Distribution
            </h3>
            <p className="text-sm text-gray-500">By category and performance</p>
          </div>
          <div className="text-sm text-gray-500">
            Total:{' '}
            {vendorPerformanceData.reduce((sum, item) => sum + item.value, 0)}%
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={vendorPerformanceData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {vendorPerformanceData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name, props) => [
                `${value}% (★${props.payload.rating})`,
                props.payload.name,
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {vendorPerformanceData.map((entry, index) => (
            <div key={entry.name} className="flex items-center text-xs">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span className="text-gray-700">{entry.name}</span>
              <span className="ml-auto text-gray-500">★{entry.rating}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
