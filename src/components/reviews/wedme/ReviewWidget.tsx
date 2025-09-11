'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageCircle,
  Share,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { MobileStarRating } from '../mobile/MobileStarRating';

interface ReviewStatus {
  id: string;
  supplierName: string;
  supplierType: string;
  reviewToken: string;
  status: 'pending' | 'completed' | 'expired';
  submittedAt?: Date;
  expiresAt: Date;
  rating?: number;
  reviewText?: string;
  platforms?: string[];
}

interface WedMeReviewWidgetProps {
  coupleId: string;
  className?: string;
  onReviewSubmit?: (reviewId: string) => void;
  showCompletedReviews?: boolean;
}

export const WedMeReviewWidget: React.FC<WedMeReviewWidgetProps> = ({
  coupleId,
  className = '',
  onReviewSubmit,
  showCompletedReviews = true,
}) => {
  const [reviews, setReviews] = useState<ReviewStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<ReviewStatus | null>(null);

  useEffect(() => {
    fetchReviewStatuses();
  }, [coupleId]);

  const fetchReviewStatuses = async () => {
    try {
      const response = await fetch(`/api/reviews/status?coupleId=${coupleId}`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Failed to fetch review statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReview = (review: ReviewStatus) => {
    // Open mobile-optimized review form in modal or navigate
    window.open(`/review/${review.reviewToken}`, '_blank');
  };

  const handleShareReview = async (review: ReviewStatus) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Review ${review.supplierName}`,
          text: `Share your experience with ${review.supplierName}`,
          url: `${window.location.origin}/review/${review.reviewToken}`,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(
          `${window.location.origin}/review/${review.reviewToken}`,
        );
      }
    }
  };

  const pendingReviews = reviews.filter((r) => r.status === 'pending');
  const completedReviews = reviews.filter((r) => r.status === 'completed');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Supplier Reviews
          </h3>
          {pendingReviews.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-primary-600 font-medium">
                {pendingReviews.length} pending
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Reviews Requested
            </h4>
            <div className="space-y-3">
              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {review.supplierName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {review.supplierType}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Expires{' '}
                        {new Date(review.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleShareReview(review)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Share review link"
                    >
                      <Share className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleQuickReview(review)}
                      className="inline-flex items-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      Write Review
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Reviews */}
        {showCompletedReviews && completedReviews.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Completed Reviews
            </h4>
            <div className="space-y-3">
              {completedReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {review.supplierName}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= (review.rating || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.submittedAt!).toLocaleDateString()}
                        </span>
                      </div>
                      {review.reviewText && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {review.reviewText}
                        </p>
                      )}
                      {review.platforms && review.platforms.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <span className="text-xs text-gray-400">
                            Posted to:
                          </span>
                          {review.platforms.map((platform) => (
                            <span
                              key={platform}
                              className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {pendingReviews.length === 0 && completedReviews.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No review requests yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Your suppliers will send review requests after your events
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WedMeReviewWidget;
