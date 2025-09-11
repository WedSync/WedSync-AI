'use client';

import React from 'react';
import { Activity, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

export default function WeddingMomentumMeter() {
  const momentumData = {
    currentScore: 78,
    trend: 'up',
    trendValue: '+12',
    weddingDate: '2025-03-15',
    daysRemaining: 158,
    metrics: {
      tasksCompleted: 24,
      vendorsBooked: 8,
      budgetAllocated: 85,
      guestsConfirmed: 67,
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (momentumData.metrics.vendorsBooked < 10) {
      recommendations.push(
        'Consider booking remaining vendors to maintain momentum',
      );
    }
    if (momentumData.metrics.guestsConfirmed < 80) {
      recommendations.push(
        'Follow up with guests for RSVPs to finalize headcount',
      );
    }
    if (momentumData.metrics.budgetAllocated < 90) {
      recommendations.push(
        'Allocate remaining budget to avoid last-minute rushes',
      );
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="text-purple-500" size={20} />
          Wedding Momentum
        </h3>
        <div
          className={`flex items-center gap-1 text-sm ${
            momentumData.trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          <TrendingUp
            size={16}
            className={momentumData.trend === 'down' ? 'rotate-180' : ''}
          />
          <span>{momentumData.trendValue}% this week</span>
        </div>
      </div>

      {/* Momentum Score */}
      <div className="text-center mb-6">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#momentum-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(momentumData.currentScore / 100) * 314} 314`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient
                id="momentum-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  className={getScoreGradient(momentumData.currentScore)
                    .split(' ')[0]
                    .replace('from-', 'stop-')}
                />
                <stop
                  offset="100%"
                  className={getScoreGradient(momentumData.currentScore)
                    .split(' ')[1]
                    .replace('to-', 'stop-')}
                />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${getScoreColor(momentumData.currentScore)}`}
              >
                {momentumData.currentScore}
              </div>
              <div className="text-sm text-gray-500">Score</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>{momentumData.daysRemaining} days until your wedding</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {momentumData.metrics.tasksCompleted}
              </div>
              <div className="text-sm text-blue-800">Tasks Completed</div>
            </div>
            <CheckCircle className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {momentumData.metrics.vendorsBooked}
              </div>
              <div className="text-sm text-green-800">Vendors Booked</div>
            </div>
            <Activity className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {momentumData.metrics.budgetAllocated}%
              </div>
              <div className="text-sm text-purple-800">Budget Allocated</div>
            </div>
            <TrendingUp className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {momentumData.metrics.guestsConfirmed}%
              </div>
              <div className="text-sm text-orange-800">Guests Confirmed</div>
            </div>
            <Calendar className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Boost Your Momentum</h4>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-600 bg-amber-50 p-3 rounded-lg"
              >
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6 pt-4 border-t">
        <button className="w-full bg-purple-50 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
          View Detailed Progress Report
        </button>
      </div>
    </div>
  );
}
