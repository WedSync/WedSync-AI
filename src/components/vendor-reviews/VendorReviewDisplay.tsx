'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  CheckCircle,
  Filter,
  ChevronDown,
  Search,
  SortAsc,
  SortDesc,
  Image as ImageIcon,
  Flag,
  Heart,
} from 'lucide-react';

interface VendorReview {
  id: string;
  title: string;
  content: string;
  overall_rating: number;
  would_recommend: boolean;
  hired_again: boolean;
  response_time_rating: number;
  helpful_count: number;
  not_helpful_count: number;
  is_verified_purchase: boolean;
  wedding_date: string;
  vendor_service_type: string;
  vendor_package_details?: string;
  total_amount_paid?: number;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
  };
  vendor_review_ratings: Array<{
    category: {
      name: string;
    };
    rating: number;
  }>;
  vendor_review_photos: Array<{
    photo_url: string;
    caption?: string;
  }>;
  vendor_review_responses: Array<{
    content: string;
    created_at: string;
    responder: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface ReviewFilters {
  rating: number | null;
  category: string;
  verified: boolean | null;
  dateRange: '30d' | '90d' | '1y' | 'all';
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

export function VendorReviewDisplay({ vendorId }: { vendorId: string }) {
  const supabase = createClientComponentClient();
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState<ReviewFilters>({
    rating: null,
    category: 'all',
    verified: null,
    dateRange: 'all',
    sortBy: 'newest',
  });

  // Load reviews
  useEffect(() => {
    loadReviews();
  }, [vendorId]);

  // Filter and sort reviews
  useEffect(() => {
    filterAndSortReviews();
  }, [reviews, filters, searchTerm]);

  const loadReviews = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('vendor_reviews')
        .select(
          `
          *,
          client:clients(first_name, last_name),
          vendor_review_ratings(
            rating,
            category:vendor_review_categories(name)
          ),
          vendor_review_photos(photo_url, caption),
          vendor_review_responses(
            content,
            created_at,
            responder:auth.users(
              raw_user_meta_data
            )
          )
        `,
        )
        .eq('vendor_id', vendorId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Load user's votes
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && data) {
        const { data: votes } = await supabase
          .from('vendor_review_votes')
          .select('review_id, is_helpful')
          .eq('user_id', user.id)
          .in(
            'review_id',
            data.map((r) => r.id),
          );

        if (votes) {
          const voteMap = votes.reduce(
            (acc, vote) => {
              acc[vote.review_id] = vote.is_helpful;
              return acc;
            },
            {} as Record<string, boolean>,
          );
          setUserVotes(voteMap);
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReviews = () => {
    let filtered = [...reviews];

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.vendor_service_type
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Rating filter
    if (filters.rating) {
      filtered = filtered.filter(
        (review) => review.overall_rating === filters.rating,
      );
    }

    // Verified filter
    if (filters.verified !== null) {
      filtered = filtered.filter(
        (review) => review.is_verified_purchase === filters.verified,
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const days =
        filters.dateRange === '30d'
          ? 30
          : filters.dateRange === '90d'
            ? 90
            : 365;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (review) => new Date(review.created_at) >= cutoff,
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case 'oldest':
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case 'highest':
        filtered.sort((a, b) => b.overall_rating - a.overall_rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.overall_rating - b.overall_rating);
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpful_count - a.helpful_count);
        break;
    }

    setFilteredReviews(filtered);
  };

  // Vote on review
  const voteOnReview = async (reviewId: string, isHelpful: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already voted
      const existingVote = userVotes[reviewId];

      if (existingVote === isHelpful) {
        // Remove vote
        await supabase
          .from('vendor_review_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        const newVotes = { ...userVotes };
        delete newVotes[reviewId];
        setUserVotes(newVotes);
      } else {
        // Add or update vote
        await supabase.from('vendor_review_votes').upsert({
          review_id: reviewId,
          user_id: user.id,
          is_helpful: isHelpful,
        });

        setUserVotes({ ...userVotes, [reviewId]: isHelpful });
      }

      // Reload reviews to get updated counts
      loadReviews();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  // Flag review
  const flagReview = async (
    reviewId: string,
    flagType: string,
    reason?: string,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('vendor_review_flags').insert({
        review_id: reviewId,
        flagger_id: user.id,
        flag_type: flagType,
        reason,
      });

      alert(
        'Thank you for reporting this review. We will investigate and take appropriate action.',
      );
    } catch (error) {
      console.error('Error flagging review:', error);
    }
  };

  const RatingStars = ({
    rating,
    size = 'sm',
  }: {
    rating: number;
    size?: 'sm' | 'lg';
  }) => {
    const starSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${starSize} ${
              i < rating ? 'text-warning-500 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const ReviewCard = ({ review }: { review: VendorReview }) => {
    const [showPhotos, setShowPhotos] = useState(false);
    const [showFullContent, setShowFullContent] = useState(false);

    const contentPreview =
      review.content.length > 300
        ? review.content.substring(0, 300) + '...'
        : review.content;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs hover:shadow-sm transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {review.title}
              </h3>
              {review.is_verified_purchase && (
                <CheckCircle
                  className="h-5 w-5 text-success-600"
                  title="Verified Purchase"
                />
              )}
            </div>

            <div className="flex items-center space-x-4 mb-2">
              <RatingStars rating={review.overall_rating} size="lg" />
              <span className="text-sm text-gray-600">
                {review.overall_rating}/5 stars
              </span>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>
                By {review.client.first_name} {review.client.last_name[0]}.
              </span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(review.created_at).toLocaleDateString()}
              </span>
              {review.total_amount_paid && (
                <span>${review.total_amount_paid.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="relative">
            <button
              onClick={() => flagReview(review.id, 'inappropriate')}
              className="text-gray-400 hover:text-gray-600"
              title="Report review"
            >
              <Flag className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Service details */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-900">
            Service: {review.vendor_service_type}
          </p>
          {review.vendor_package_details && (
            <p className="text-xs text-gray-600 mt-1">
              {review.vendor_package_details}
            </p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            Wedding Date: {new Date(review.wedding_date).toLocaleDateString()}
          </p>
        </div>

        {/* Category ratings */}
        {review.vendor_review_ratings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Detailed Ratings
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {review.vendor_review_ratings.map((rating, index) => (
                <div key={index} className="text-center">
                  <p className="text-xs text-gray-600">
                    {rating.category.name}
                  </p>
                  <div className="flex justify-center mt-1">
                    <RatingStars rating={rating.rating} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review content */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {showFullContent ? review.content : contentPreview}
          </p>
          {review.content.length > 300 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
            >
              {showFullContent ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Photos */}
        {review.vendor_review_photos.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium mb-2"
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              {review.vendor_review_photos.length} photo(s)
            </button>

            {showPhotos && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {review.vendor_review_photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Review photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {photo.caption && (
                      <p className="text-xs text-gray-600 mt-1">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendation badges */}
        <div className="flex items-center space-x-3 mb-4">
          {review.would_recommend && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700 border border-success-200">
              <Heart className="h-3 w-3 mr-1" />
              Recommends
            </span>
          )}
          {review.hired_again && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Would Hire Again
            </span>
          )}
        </div>

        {/* Helpful votes */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => voteOnReview(review.id, true)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                userVotes[review.id] === true
                  ? 'bg-success-50 text-success-700'
                  : 'text-gray-600 hover:text-success-600 hover:bg-success-50'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Helpful ({review.helpful_count})</span>
            </button>

            <button
              onClick={() => voteOnReview(review.id, false)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                userVotes[review.id] === false
                  ? 'bg-error-50 text-error-700'
                  : 'text-gray-600 hover:text-error-600 hover:bg-error-50'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>Not helpful ({review.not_helpful_count})</span>
            </button>
          </div>

          {review.response_time_rating && (
            <div className="text-sm text-gray-600">
              Response Time:{' '}
              <RatingStars rating={review.response_time_rating} />
            </div>
          )}
        </div>

        {/* Vendor response */}
        {review.vendor_review_responses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              Vendor Response
            </h5>
            {review.vendor_review_responses.map((response, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">{response.content}</p>
                <p className="text-xs text-gray-600">
                  {response.responder.first_name} {response.responder.last_name}{' '}
                  • {new Date(response.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Customer Reviews ({filteredReviews.length})
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          <ChevronDown
            className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Rating filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <select
                  value={filters.rating || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      rating: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All ratings</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </div>

              {/* Verified filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification
                </label>
                <select
                  value={
                    filters.verified === null ? '' : filters.verified.toString()
                  }
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      verified:
                        e.target.value === ''
                          ? null
                          : e.target.value === 'true',
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All reviews</option>
                  <option value="true">Verified only</option>
                  <option value="false">Unverified only</option>
                </select>
              </div>

              {/* Date range filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({ ...filters, dateRange: e.target.value as any })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All time</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
              </div>

              {/* Sort filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value as any })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                  <option value="helpful">Most helpful</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No reviews found
            </h3>
            <p className="mt-2 text-gray-600">
              {searchTerm ||
              filters.rating ||
              filters.verified !== null ||
              filters.dateRange !== 'all'
                ? 'Try adjusting your search or filters'
                : 'This vendor has no reviews yet'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>
    </div>
  );
}
