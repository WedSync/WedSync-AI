'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Check,
  X,
  Flag,
  Eye,
  AlertTriangle,
  Clock,
  Star,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Search,
  ChevronDown,
} from 'lucide-react';

interface Review {
  id: string;
  vendor_id: string;
  client_id: string;
  title: string;
  content: string;
  overall_rating: number;
  would_recommend: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_reason?: string;
  created_at: string;
  vendor: {
    business_name: string;
    category: string;
  };
  client: {
    first_name: string;
    last_name: string;
  };
  vendor_review_flags: Array<{
    flag_type: string;
    reason: string;
    created_at: string;
  }>;
}

export function ReviewModerationDashboard() {
  const supabase = createClientComponentClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [moderatingReview, setModeratingReview] = useState<string | null>(null);

  // Load reviews
  useEffect(() => {
    loadReviews();
  }, [filterStatus]);

  const loadReviews = async () => {
    setLoading(true);

    let query = supabase
      .from('vendor_reviews')
      .select(
        `
        *,
        vendor:vendors(business_name, category),
        client:clients(first_name, last_name),
        vendor_review_flags(flag_type, reason, created_at)
      `,
      )
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('moderation_status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading reviews:', error);
    } else {
      setReviews(data || []);
    }

    setLoading(false);
  };

  // Moderate review
  const moderateReview = async (
    reviewId: string,
    status: 'approved' | 'rejected' | 'flagged',
    reason?: string,
  ) => {
    setModeratingReview(reviewId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('vendor_reviews')
        .update({
          moderation_status: status,
          moderation_reason: reason,
          moderated_by: user.id,
        })
        .eq('id', reviewId);

      if (error) throw error;

      // Refresh reviews
      await loadReviews();

      // Close detail view if this review was selected
      if (selectedReview?.id === reviewId) {
        setSelectedReview(null);
      }

      // If auto-moderation flagged as spam, send notification
      if (status === 'flagged') {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'review_flagged',
            reviewId,
            reason: reason || 'Content review required',
          },
        });
      }
    } catch (error) {
      console.error('Error moderating review:', error);
    } finally {
      setModeratingReview(null);
    }
  };

  // Auto-moderate with AI
  const autoModerate = async (reviewId: string) => {
    setModeratingReview(reviewId);

    try {
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      // Call content moderation Edge Function
      const { data, error } = await supabase.functions.invoke(
        'moderate-content',
        {
          body: {
            reviewId,
            content: review.content + ' ' + review.title,
            action: 'auto-moderate',
          },
        },
      );

      if (error) throw error;

      // Refresh reviews
      await loadReviews();
    } catch (error) {
      console.error('Error auto-moderating review:', error);
    } finally {
      setModeratingReview(null);
    }
  };

  const filteredReviews = reviews.filter(
    (review) =>
      searchTerm === '' ||
      review.vendor.business_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const StatusBadge = ({ status, flags }: { status: string; flags: any[] }) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (status) {
      case 'pending':
        return (
          <span
            className={`${baseClasses} bg-warning-50 text-warning-700 border border-warning-200`}
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span
            className={`${baseClasses} bg-success-50 text-success-700 border border-success-200`}
          >
            <Check className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span
            className={`${baseClasses} bg-error-50 text-error-700 border border-error-200`}
          >
            <X className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      case 'flagged':
        return (
          <span
            className={`${baseClasses} bg-red-50 text-red-700 border border-red-200`}
          >
            <Flag className="h-3 w-3 mr-1" />
            Flagged ({flags.length})
          </span>
        );
      default:
        return null;
    }
  };

  const RatingDisplay = ({ rating }: { rating: number }) => (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-warning-500 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700">{rating}/5</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>

        {/* Statistics */}
        <div className="flex space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-600">
              {reviews.filter((r) => r.moderation_status === 'pending').length}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-600">
              {reviews.filter((r) => r.moderation_status === 'flagged').length}
            </div>
            <div className="text-xs text-gray-600">Flagged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">
              {reviews.filter((r) => r.moderation_status === 'approved').length}
            </div>
            <div className="text-xs text-gray-600">Approved</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews by vendor, title, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pending">Pending Reviews</option>
              <option value="flagged">Flagged Reviews</option>
              <option value="approved">Approved Reviews</option>
              <option value="rejected">Rejected Reviews</option>
              <option value="all">All Reviews</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">No reviews found</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer transition-all hover:border-primary-300 hover:shadow-sm ${
                  selectedReview?.id === review.id
                    ? 'border-primary-500 shadow-sm'
                    : ''
                }`}
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {review.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {review.vendor.business_name} • {review.vendor.category}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge
                      status={review.moderation_status}
                      flags={review.vendor_review_flags}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <RatingDisplay rating={review.overall_rating} />
                  <div className="flex items-center text-sm text-gray-500">
                    <User className="h-4 w-4 mr-1" />
                    {review.client.first_name} {review.client.last_name}
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {review.content}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>

                  {review.vendor_review_flags.length > 0 && (
                    <div className="flex items-center text-xs text-error-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {review.vendor_review_flags.length} flag(s)
                    </div>
                  )}
                </div>

                {/* Quick actions for pending reviews */}
                {review.moderation_status === 'pending' && (
                  <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moderateReview(review.id, 'approved');
                      }}
                      disabled={moderatingReview === review.id}
                      className="flex items-center px-3 py-1 bg-success-50 text-success-700 rounded-md hover:bg-success-100 text-xs font-medium"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moderateReview(
                          review.id,
                          'rejected',
                          'Content does not meet guidelines',
                        );
                      }}
                      disabled={moderatingReview === review.id}
                      className="flex items-center px-3 py-1 bg-error-50 text-error-700 rounded-md hover:bg-error-100 text-xs font-medium"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        autoModerate(review.id);
                      }}
                      disabled={moderatingReview === review.id}
                      className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-xs font-medium"
                    >
                      AI Check
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Review detail panel */}
        <div className="lg:col-span-1">
          {selectedReview ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Details
                </h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge
                      status={selectedReview.moderation_status}
                      flags={selectedReview.vendor_review_flags}
                    />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Vendor
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedReview.vendor.business_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedReview.vendor.category}
                  </p>
                </div>

                {/* Customer */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedReview.client.first_name}{' '}
                    {selectedReview.client.last_name}
                  </p>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Rating
                  </label>
                  <div className="mt-1">
                    <RatingDisplay rating={selectedReview.overall_rating} />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedReview.title}
                  </p>
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Review Content
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedReview.content}
                    </p>
                  </div>
                </div>

                {/* Flags */}
                {selectedReview.vendor_review_flags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Flags
                    </label>
                    <div className="mt-2 space-y-2">
                      {selectedReview.vendor_review_flags.map((flag, index) => (
                        <div
                          key={index}
                          className="bg-error-50 border border-error-200 rounded-md p-3"
                        >
                          <div className="flex items-center">
                            <Flag className="h-4 w-4 text-error-600 mr-2" />
                            <span className="text-sm font-medium text-error-800 capitalize">
                              {flag.flag_type}
                            </span>
                          </div>
                          {flag.reason && (
                            <p className="mt-1 text-xs text-error-700">
                              {flag.reason}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-error-600">
                            {new Date(flag.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderation reason */}
                {selectedReview.moderation_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Moderation Reason
                    </label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedReview.moderation_reason}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {selectedReview.moderation_status === 'pending' && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() =>
                        moderateReview(selectedReview.id, 'approved')
                      }
                      disabled={moderatingReview === selectedReview.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve Review
                    </button>

                    <button
                      onClick={() =>
                        moderateReview(
                          selectedReview.id,
                          'rejected',
                          'Content does not meet community guidelines',
                        )
                      }
                      disabled={moderatingReview === selectedReview.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Review
                    </button>

                    <button
                      onClick={() =>
                        moderateReview(
                          selectedReview.id,
                          'flagged',
                          'Requires further review',
                        )
                      }
                      disabled={moderatingReview === selectedReview.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700 disabled:opacity-50"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Flag for Review
                    </button>
                  </div>
                )}

                {selectedReview.moderation_status === 'flagged' && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() =>
                        moderateReview(
                          selectedReview.id,
                          'approved',
                          'Review cleared after investigation',
                        )
                      }
                      disabled={moderatingReview === selectedReview.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Clear & Approve
                    </button>

                    <button
                      onClick={() =>
                        moderateReview(
                          selectedReview.id,
                          'rejected',
                          'Review violates community guidelines',
                        )
                      }
                      disabled={moderatingReview === selectedReview.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Review
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <Eye className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">
                Select a review to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
