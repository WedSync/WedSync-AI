'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  StarIcon,
  TrendingUpIcon,
  MessageSquareIcon,
  UsersIcon,
  PlusIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  SettingsIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
} from 'lucide-react';
import { ReviewMetrics } from './ReviewMetrics';
import { ReviewCampaignCard } from './ReviewCampaignCard';

interface ReviewDashboardProps {
  supplierId: string;
  className?: string;
}

interface DashboardStats {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  activeCampaigns: number;
  pendingRequests: number;
  monthlyGrowth: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  platforms: string[];
  sentCount: number;
  responseCount: number;
  responseRate: number;
  createdAt: string;
  lastSent?: string;
}

interface RecentReview {
  id: string;
  clientName: string;
  platform: string;
  rating: number;
  text: string;
  date: string;
  weddingDate: string;
  venue?: string;
}

export function ReviewDashboard({
  supplierId,
  className = '',
}: ReviewDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalReviews: 0,
    averageRating: 0,
    responseRate: 0,
    activeCampaigns: 0,
    pendingRequests: 0,
    monthlyGrowth: 0,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '7d' | '30d' | '90d' | '1y'
  >('30d');

  useEffect(() => {
    loadDashboardData();
  }, [supplierId, selectedTimeframe]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from your API
      // For now, using mock data that demonstrates the component structure

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats({
        totalReviews: 127,
        averageRating: 4.8,
        responseRate: 67,
        activeCampaigns: 3,
        pendingRequests: 12,
        monthlyGrowth: 23,
      });

      setCampaigns([
        {
          id: '1',
          name: 'Post-Wedding Reviews',
          status: 'active',
          platforms: ['google', 'facebook'],
          sentCount: 45,
          responseCount: 32,
          responseRate: 71,
          createdAt: '2024-01-15',
          lastSent: '2024-01-20',
        },
        {
          id: '2',
          name: 'Engagement Session Follow-up',
          status: 'active',
          platforms: ['google', 'weddingwire'],
          sentCount: 28,
          responseCount: 15,
          responseRate: 54,
          createdAt: '2024-01-10',
        },
        {
          id: '3',
          name: 'VIP Client Reviews',
          status: 'paused',
          platforms: ['google', 'facebook', 'yelp'],
          sentCount: 12,
          responseCount: 9,
          responseRate: 75,
          createdAt: '2024-01-05',
        },
      ]);

      setRecentReviews([
        {
          id: '1',
          clientName: 'Emma & Mike',
          platform: 'google',
          rating: 5,
          text: 'Absolutely incredible photographer! Jake captured every magical moment of our special day perfectly.',
          date: '2024-01-18',
          weddingDate: '2024-01-05',
          venue: 'Sunset Manor',
        },
        {
          id: '2',
          clientName: 'Sarah & Tom',
          platform: 'facebook',
          rating: 5,
          text: 'Professional, creative, and so easy to work with. Our photos are stunning!',
          date: '2024-01-17',
          weddingDate: '2024-01-03',
          venue: 'Garden Estate',
        },
        {
          id: '3',
          clientName: 'Lisa & David',
          platform: 'weddingwire',
          rating: 4,
          text: 'Great experience overall. Photos came out beautiful and delivery was quick.',
          date: '2024-01-16',
          weddingDate: '2024-01-01',
          venue: 'Historic Venue',
        },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignToggle = async (
    campaignId: string,
    newStatus: 'active' | 'paused',
  ) => {
    try {
      // Update campaign status
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? { ...campaign, status: newStatus }
            : campaign,
        ),
      );

      // In real implementation, would call API here
      console.log(`Campaign ${campaignId} ${newStatus}`);
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      google: '🌟',
      facebook: '👍',
      yelp: '📝',
      weddingwire: '💍',
      theknot: '🎗️',
    };
    return icons[platform as keyof typeof icons] || '⭐';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your review collection campaigns and track performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Link
            href="/reviews/campaigns/new"
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalReviews}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquareIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <TrendingUpIcon className="h-4 w-4 text-success-600 mr-1" />
            <span className="text-sm text-success-700 font-medium">
              +{stats.monthlyGrowth}%
            </span>
            <span className="text-sm text-gray-500 ml-2">this month</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Average Rating
              </p>
              <div className="flex items-center mt-1">
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageRating}
                </p>
                <div className="flex ml-2">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(stats.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.responseRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Campaigns
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.activeCampaigns}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          {stats.pendingRequests > 0 && (
            <div className="mt-4">
              <span className="text-sm text-orange-700 font-medium">
                {stats.pendingRequests} pending requests
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Campaigns */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Active Campaigns
              </h2>
              <Link
                href="/reviews/campaigns"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
              >
                View All
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <ReviewCampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onToggleStatus={(newStatus) =>
                    handleCampaignToggle(campaign.id, newStatus)
                  }
                  onEdit={() => {}} // Would navigate to edit page
                  onView={() => {}} // Would open campaign details
                />
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  No campaigns yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first review collection campaign to start
                  gathering testimonials.
                </p>
                <Link
                  href="/reviews/campaigns/new"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Campaign
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Reviews
              </h2>
              <Link
                href="/reviews/all"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
              >
                View All
                <ExternalLinkIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className="text-lg"
                        role="img"
                        aria-label={review.platform}
                      >
                        {getPlatformIcon(review.platform)}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">
                        {review.clientName}
                      </span>
                      <div className="flex items-center">
                        {[...Array(review.rating)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className="h-3 w-3 text-yellow-400 fill-current"
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(review.date)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                    {review.text}
                  </p>

                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span className="inline-flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {formatDate(review.weddingDate)}
                    </span>
                    {review.venue && (
                      <span className="inline-flex items-center">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {review.venue}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  No reviews yet
                </h3>
                <p className="text-sm text-gray-500">
                  Reviews will appear here as clients respond to your campaigns.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <ReviewMetrics supplierId={supplierId} timeframe={selectedTimeframe} />
    </div>
  );
}
