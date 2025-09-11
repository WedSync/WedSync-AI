'use client';

import React, { useState } from 'react';
import {
  MessageCircle,
  Star,
  TrendingUp,
  Award,
  ExternalLink,
} from 'lucide-react';
import { WedMeReviewWidget } from './ReviewWidget';

interface ReviewMetrics {
  totalRequested: number;
  completed: number;
  avgRating: number;
  recentReviews: number;
}

interface ReviewDashboardSectionProps {
  coupleId: string;
  metrics?: ReviewMetrics;
  className?: string;
}

export const ReviewDashboardSection: React.FC<ReviewDashboardSectionProps> = ({
  coupleId,
  metrics,
  className = '',
}) => {
  const [showAllReviews, setShowAllReviews] = useState(false);

  const defaultMetrics: ReviewMetrics = {
    totalRequested: 0,
    completed: 0,
    avgRating: 0,
    recentReviews: 0,
  };

  const reviewMetrics = metrics || defaultMetrics;
  const completionRate =
    reviewMetrics.totalRequested > 0
      ? (reviewMetrics.completed / reviewMetrics.totalRequested) * 100
      : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Requested
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {reviewMetrics.totalRequested}
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Completed Reviews */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {reviewMetrics.completed}
              </p>
              {reviewMetrics.totalRequested > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(completionRate)}% completion rate
                </p>
              )}
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-2xl font-bold text-gray-900">
                  {reviewMetrics.avgRating > 0
                    ? reviewMetrics.avgRating.toFixed(1)
                    : '--'}
                </p>
                {reviewMetrics.avgRating > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  </div>
                )}
              </div>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {reviewMetrics.recentReviews}
              </p>
              <p className="text-xs text-gray-500 mt-1">New reviews</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Review Widget */}
      <WedMeReviewWidget
        coupleId={coupleId}
        showCompletedReviews={showAllReviews}
        className="lg:col-span-2"
      />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Review Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Show All Reviews Toggle */}
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {showAllReviews ? 'Hide' : 'Show'} Completed Reviews
              </p>
              <p className="text-xs text-gray-500 mt-1">
                View your review history and responses
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-gray-600" />
            </div>
          </button>

          {/* Request Review Link */}
          <a
            href="/help/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                Review Help & Tips
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Learn how to get more reviews from your suppliers
              </p>
            </div>
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-primary-600" />
            </div>
          </a>
        </div>
      </div>

      {/* Review Impact Section */}
      {reviewMetrics.completed > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg border border-primary-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Your Review Impact
              </h3>
              <p className="text-sm text-gray-600">
                You're helping other couples make great decisions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {reviewMetrics.completed}
              </p>
              <p className="text-xs text-gray-600 mt-1">Reviews Written</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {Math.round(reviewMetrics.avgRating * reviewMetrics.completed)}
              </p>
              <p className="text-xs text-gray-600 mt-1">Total Stars Given</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDashboardSection;
