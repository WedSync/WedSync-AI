'use client';

interface UsageDisplayProps {
  usage: {
    clients: number;
    vendors: number;
    journeys: number;
    storage_gb: number;
    team_members: number;
    monthly_api_requests: number;
    email_sends: number;
    sms_sends: number;
  };
  limits: {
    clients: number;
    vendors: number;
    journeys: number;
    storage_gb: number;
    team_members: number;
    api_requests: number;
    email_sends: number;
    sms_sends: number;
  };
  currentPlan: string;
}

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  icon: string;
  formatValue?: (value: number) => string;
}

function UsageItem({
  label,
  current,
  limit,
  unit = '',
  icon,
  formatValue,
}: UsageItemProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80 && !isUnlimited;
  const isOverLimit = percentage >= 100 && !isUnlimited;

  const formatNumber = (num: number): string => {
    if (formatValue) return formatValue(num);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-amber-500';
    return 'bg-primary-500';
  };

  const getTextColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-amber-600';
    return 'text-gray-900';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-lg">{icon}</div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{label}</h4>
          <div className={`text-lg font-semibold ${getTextColor()}`}>
            {formatNumber(current)}
            {isUnlimited ? (
              <span className="text-sm font-normal text-gray-500 ml-1">
                / Unlimited{unit}
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {formatNumber(limit)}
                {unit}
              </span>
            )}
          </div>
        </div>
        {isOverLimit && (
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        {isNearLimit && !isOverLimit && (
          <div className="text-amber-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {!isUnlimited && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{percentage.toFixed(1)}% used</span>
            {isOverLimit && (
              <span className="text-red-600 font-medium">
                {formatNumber(current - limit)} over limit
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function UsageDisplay({
  usage,
  limits,
  currentPlan,
}: UsageDisplayProps) {
  const formatStorage = (gb: number): string => {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    if (gb < 1) return `${(gb * 1000).toFixed(0)} MB`;
    return `${gb.toFixed(1)} GB`;
  };

  const usageItems = [
    {
      label: 'Clients',
      current: usage.clients || 0,
      limit: limits.clients || 0,
      icon: '👥',
    },
    {
      label: 'Vendors',
      current: usage.vendors || 0,
      limit: limits.vendors || 0,
      icon: '🏢',
    },
    {
      label: 'Journeys',
      current: usage.journeys || 0,
      limit: limits.journeys || 0,
      icon: '🗺️',
    },
    {
      label: 'Storage',
      current: usage.storage_gb || 0,
      limit: limits.storage_gb || 0,
      icon: '💾',
      formatValue: formatStorage,
    },
    {
      label: 'Team Members',
      current: usage.team_members || 0,
      limit: limits.team_members || 0,
      icon: '👤',
    },
    {
      label: 'API Requests',
      current: usage.monthly_api_requests || 0,
      limit: limits.api_requests || 0,
      unit: '/month',
      icon: '🔌',
    },
    {
      label: 'Email Sends',
      current: usage.email_sends || 0,
      limit: limits.email_sends || 0,
      unit: '/month',
      icon: '📧',
    },
    {
      label: 'SMS Sends',
      current: usage.sms_sends || 0,
      limit: limits.sms_sends || 0,
      unit: '/month',
      icon: '📱',
    },
  ];

  const hasOverages = usageItems.some(
    (item) => item.limit !== -1 && item.current > item.limit,
  );

  const nearLimitItems = usageItems.filter((item) => {
    if (item.limit === -1) return false;
    const percentage = (item.current / item.limit) * 100;
    return percentage >= 80 && percentage < 100;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Usage & Limits
            </h2>
            <p className="text-gray-600 mt-1">
              Track your current usage against plan limits
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 capitalize">
              {currentPlan} Plan
            </div>
            {hasOverages && (
              <div className="text-sm text-red-600 font-medium">
                Some limits exceeded
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Usage Alerts */}
        {hasOverages && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Usage Limits Exceeded
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  You've exceeded some plan limits. Consider upgrading to avoid
                  service interruptions.
                </p>
                <button className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline">
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {nearLimitItems.length > 0 && !hasOverages && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-amber-500 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">
                  Approaching Limits
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  You're approaching limits for{' '}
                  {nearLimitItems.map((item) => item.label).join(', ')}.
                  Consider upgrading before you hit the limits.
                </p>
                <button className="mt-2 text-sm font-medium text-amber-800 hover:text-amber-900 underline">
                  View Plans
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usageItems.map((item, index) => (
            <UsageItem
              key={index}
              label={item.label}
              current={item.current}
              limit={item.limit}
              unit={item.unit}
              icon={item.icon}
              formatValue={item.formatValue}
            />
          ))}
        </div>

        {/* Usage Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Usage Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {usageItems.filter((item) => item.limit === -1).length}
              </div>
              <div className="text-gray-600">Unlimited Features</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-amber-600">
                {nearLimitItems.length}
              </div>
              <div className="text-gray-600">Near Limits</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {
                  usageItems.filter(
                    (item) => item.limit !== -1 && item.current > item.limit,
                  ).length
                }
              </div>
              <div className="text-gray-600">Over Limits</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
