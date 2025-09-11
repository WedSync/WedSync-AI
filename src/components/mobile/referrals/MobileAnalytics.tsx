'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

interface MobileAnalyticsProps {
  realTime?: boolean;
  touchOptimizations?: any;
}

export const MobileAnalytics: React.FC<MobileAnalyticsProps> = ({
  realTime = false,
  touchOptimizations,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [data, setData] = useState({
    totalReferrals: 42,
    activeReferrals: 18,
    totalEarnings: 2840,
    thisMonthEarnings: 680,
    conversionRate: 68.5,
    lastUpdated: new Date().toLocaleTimeString(),
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        totalReferrals: prev.totalReferrals + Math.random() > 0.9 ? 1 : 0,
        activeReferrals: prev.activeReferrals + Math.random() > 0.95 ? 1 : 0,
        thisMonthEarnings:
          prev.thisMonthEarnings + Math.random() > 0.92
            ? Math.floor(Math.random() * 50)
            : 0,
        lastUpdated: new Date().toLocaleTimeString(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [realTime]);

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    color: string;
    trend?: string;
  }) => (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <div className="flex items-center text-green-600 text-xs">
            <TrendingUp size={12} />
            <span className="ml-1">{trend}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-600">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Referral Analytics</h3>
          <p className="text-sm text-gray-600">
            {realTime ? 'Live' : 'Updated'}: {data.lastUpdated}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`
            p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors
            ${touchOptimizations?.touchTarget || 'min-h-[48px] min-w-[48px]'}
          `}
          style={{ touchAction: 'manipulation' }}
        >
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {isVisible && (
        <div className="p-4 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total Referrals"
              value={data.totalReferrals}
              subtitle="All time"
              icon={Users}
              color="bg-blue-500"
              trend="+12%"
            />
            <StatCard
              title="Active This Month"
              value={data.activeReferrals}
              subtitle="Still converting"
              icon={TrendingUp}
              color="bg-green-500"
              trend="+8%"
            />
            <StatCard
              title="Total Earnings"
              value={`£${data.totalEarnings}`}
              subtitle="All time commission"
              icon={DollarSign}
              color="bg-purple-500"
              trend="+15%"
            />
            <StatCard
              title="This Month"
              value={`£${data.thisMonthEarnings}`}
              subtitle="Current earnings"
              icon={Calendar}
              color="bg-orange-500"
              trend="+22%"
            />
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              Conversion Rate
            </h4>
            <div className="flex items-center mb-2">
              <div className="flex-grow bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
                  style={{ width: `${data.conversionRate}%` }}
                />
              </div>
              <span className="ml-3 font-bold text-lg">
                {data.conversionRate}%
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Above average! Keep sharing to maintain this great rate.
            </p>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recent Activity</h4>
            <div className="space-y-2">
              {[
                {
                  time: '2m ago',
                  event: 'New referral signed up',
                  type: 'success',
                },
                {
                  time: '1h ago',
                  event: 'Referral upgraded to Pro',
                  type: 'earning',
                },
                { time: '3h ago', event: 'QR code scanned', type: 'activity' },
                {
                  time: '1d ago',
                  event: 'Link shared on social',
                  type: 'activity',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'earning'
                          ? 'bg-purple-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-grow">
                    <p className="text-sm text-gray-900">{activity.event}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Indicator */}
          {realTime && (
            <div className="flex items-center justify-center p-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              <span className="text-sm text-green-700">
                Live updates enabled
              </span>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Tips to increase referrals:
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Share your QR code at networking events</li>
              <li>• Include your referral link in email signatures</li>
              <li>• Post about WedSync on social media</li>
              <li>• Recommend to couples during consultations</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
