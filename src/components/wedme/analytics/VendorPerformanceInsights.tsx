'use client';

import React from 'react';
import { Star, TrendingUp, Users, Calendar } from 'lucide-react';

export default function VendorPerformanceInsights() {
  const vendorData = [
    {
      id: 1,
      name: 'Bloom Photography',
      category: 'Photography',
      rating: 4.9,
      completedWeddings: 127,
      avgResponseTime: '2.3 hours',
      trend: 'up',
      trendValue: '+8%',
    },
    {
      id: 2,
      name: 'Grand Ballroom',
      category: 'Venue',
      rating: 4.7,
      completedWeddings: 89,
      avgResponseTime: '4.1 hours',
      trend: 'up',
      trendValue: '+5%',
    },
    {
      id: 3,
      name: 'Sweet Dreams Catering',
      category: 'Catering',
      rating: 4.8,
      completedWeddings: 156,
      avgResponseTime: '1.8 hours',
      trend: 'down',
      trendValue: '-2%',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Vendor Performance Insights
        </h3>
        <div className="text-sm text-gray-500">Updated 2 hours ago</div>
      </div>

      <div className="space-y-4">
        {vendorData.map((vendor) => (
          <div
            key={vendor.id}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{vendor.name}</h4>
                <p className="text-sm text-gray-500">{vendor.category}</p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  vendor.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <TrendingUp
                  size={16}
                  className={vendor.trend === 'down' ? 'rotate-180' : ''}
                />
                <span>{vendor.trendValue}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                <div>
                  <div className="font-medium">{vendor.rating}</div>
                  <div className="text-gray-500">Rating</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                <div>
                  <div className="font-medium">{vendor.completedWeddings}</div>
                  <div className="text-gray-500">Weddings</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users size={16} className="text-purple-500" />
                <div>
                  <div className="font-medium">{vendor.avgResponseTime}</div>
                  <div className="text-gray-500">Response</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
          View Full Vendor Analytics
        </button>
      </div>
    </div>
  );
}
