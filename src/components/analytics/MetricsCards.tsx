'use client';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon,
  loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="mt-4">
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="p-3 bg-primary-50 rounded-lg">{icon}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <div
          className={`flex items-center text-sm font-medium ${
            changeType === 'increase'
              ? 'text-green-600'
              : changeType === 'decrease'
                ? 'text-red-600'
                : 'text-gray-500'
          }`}
        >
          {changeType === 'increase' && (
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {changeType === 'decrease' && (
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {change}
        </div>
        <span className="text-sm text-gray-500 ml-2">vs last period</span>
      </div>
    </div>
  );
}

interface MetricsCardsProps {
  metrics: any;
  loading?: boolean;
}

export function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: loading
        ? '---'
        : `$${metrics?.totalRevenue?.toLocaleString() || '0'}`,
      change: loading
        ? '---'
        : `${metrics?.revenueGrowth >= 0 ? '+' : ''}${metrics?.revenueGrowth?.toFixed(1) || '0'}%`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.revenueGrowth > 0
          ? ('increase' as const)
          : metrics?.revenueGrowth < 0
            ? ('decrease' as const)
            : ('neutral' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      title: 'Active Clients',
      value: loading ? '---' : metrics?.activeClients?.toLocaleString() || '0',
      change: loading
        ? '---'
        : `${metrics?.clientGrowth >= 0 ? '+' : ''}${metrics?.clientGrowth?.toFixed(1) || '0'}%`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.clientGrowth > 0
          ? ('increase' as const)
          : metrics?.clientGrowth < 0
            ? ('decrease' as const)
            : ('neutral' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      title: 'Wedding Bookings',
      value: loading
        ? '---'
        : metrics?.weddingBookings?.toLocaleString() || '0',
      change: loading
        ? '---'
        : `${metrics?.bookingGrowth >= 0 ? '+' : ''}${metrics?.bookingGrowth?.toFixed(1) || '0'}%`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.bookingGrowth > 0
          ? ('increase' as const)
          : metrics?.bookingGrowth < 0
            ? ('decrease' as const)
            : ('neutral' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      title: 'Vendor Performance',
      value: loading
        ? '---'
        : `${metrics?.avgVendorRating?.toFixed(1) || '0'}/5.0`,
      change: loading
        ? '---'
        : `${metrics?.vendorRatingGrowth >= 0 ? '+' : ''}${metrics?.vendorRatingGrowth?.toFixed(2) || '0'}`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.vendorRatingGrowth > 0
          ? ('increase' as const)
          : metrics?.vendorRatingGrowth < 0
            ? ('decrease' as const)
            : ('neutral' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
    },
    {
      title: 'Platform Uptime',
      value: loading ? '---' : `${metrics?.uptime?.toFixed(2) || '99.9'}%`,
      change: loading
        ? '---'
        : `${metrics?.uptimeChange >= 0 ? '+' : ''}${metrics?.uptimeChange?.toFixed(3) || '0'}%`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.uptimeChange >= 0
          ? ('increase' as const)
          : ('decrease' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      title: 'Peak Season Load',
      value: loading ? '---' : `${metrics?.peakSeasonLoad?.toFixed(1) || '0'}x`,
      change: loading ? '---' : `${metrics?.loadTrend || 'Stable'}`,
      changeType: loading
        ? ('neutral' as const)
        : metrics?.loadTrend === 'Increasing'
          ? ('increase' as const)
          : metrics?.loadTrend === 'Decreasing'
            ? ('decrease' as const)
            : ('neutral' as const),
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <MetricCard
          key={index}
          title={card.title}
          value={card.value}
          change={card.change}
          changeType={card.changeType}
          icon={card.icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
