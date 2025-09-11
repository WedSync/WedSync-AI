'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Trophy,
  Crown,
  Medal,
  Star,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Award,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LeaderboardViewProps,
  LeaderboardEntry,
  LeaderboardType,
  TimePeriod,
  SupplierCategory,
} from '@/types/supplier-referrals';

// Mock data for demonstration (in real app, this would come from API)
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    supplier_id: '1',
    supplier_name: 'Sarah Photography',
    supplier_category: 'photography',
    location: { city: 'London', region: 'Greater London', country: 'UK' },
    rank: 1,
    score: 47,
    change_from_last_period: 2,
    badge: {
      id: 'monthly-champion',
      name: 'Monthly Champion',
      description: 'Top referrer this month',
      icon_url: '/badges/monthly-champion.svg',
      color: 'gold',
      criteria: { type: 'referrals_sent', target: 1 },
    },
    profile_image_url: '/avatars/sarah.jpg',
    is_current_user: true,
    stats: {
      referrals_sent: 47,
      conversions: 23,
      rewards_earned: 180000, // £1,800 in pence
      conversion_rate: 48.9,
    },
  },
  {
    supplier_id: '2',
    supplier_name: 'Elite Venues London',
    supplier_category: 'venue',
    location: { city: 'London', region: 'Greater London', country: 'UK' },
    rank: 2,
    score: 41,
    change_from_last_period: -1,
    profile_image_url: '/avatars/elite-venues.jpg',
    is_current_user: false,
    stats: {
      referrals_sent: 41,
      conversions: 28,
      rewards_earned: 220000, // £2,200 in pence
      conversion_rate: 68.3,
    },
  },
  {
    supplier_id: '3',
    supplier_name: 'Bloom & Blossom Florists',
    supplier_category: 'florist',
    location: {
      city: 'Manchester',
      region: 'Greater Manchester',
      country: 'UK',
    },
    rank: 3,
    score: 39,
    change_from_last_period: 3,
    badge: {
      id: 'networking-pro',
      name: 'Networking Pro',
      description: 'Referred 10 suppliers successfully',
      icon_url: '/badges/networking-pro.svg',
      color: 'silver',
      criteria: { type: 'conversions', target: 10 },
    },
    profile_image_url: '/avatars/bloom-blossom.jpg',
    is_current_user: false,
    stats: {
      referrals_sent: 39,
      conversions: 19,
      rewards_earned: 145000, // £1,450 in pence
      conversion_rate: 48.7,
    },
  },
  // Add more mock entries...
  {
    supplier_id: '4',
    supplier_name: 'Perfect Day Planning',
    supplier_category: 'planning',
    location: { city: 'Birmingham', region: 'West Midlands', country: 'UK' },
    rank: 4,
    score: 35,
    change_from_last_period: 0,
    is_current_user: false,
    stats: {
      referrals_sent: 35,
      conversions: 15,
      rewards_earned: 120000,
      conversion_rate: 42.9,
    },
  },
  {
    supplier_id: '5',
    supplier_name: 'Harmonious Sounds',
    supplier_category: 'music',
    location: { city: 'Bristol', region: 'South West', country: 'UK' },
    rank: 5,
    score: 32,
    change_from_last_period: 1,
    badge: {
      id: 'conversion-master',
      name: 'Conversion Master',
      description: '80%+ conversion rate with 5+ referrals',
      icon_url: '/badges/conversion-master.svg',
      color: 'platinum',
      criteria: { type: 'rate', target: 80 },
    },
    is_current_user: false,
    stats: {
      referrals_sent: 32,
      conversions: 26,
      rewards_earned: 195000,
      conversion_rate: 81.3,
    },
  },
];

/**
 * LeaderboardView Component
 *
 * Displays multi-dimensional supplier referral rankings with filtering.
 * Designed to be encouraging rather than competitive - highlights multiple ways to excel.
 *
 * Features:
 * - Multi-dimensional rankings (conversions, total referrals, conversion rate, rewards)
 * - Category filtering (photography, venues, florists, etc.)
 * - Geographic filtering (region, city)
 * - Time period selection (week, month, quarter, year)
 * - User position highlighting
 * - Achievement badge display
 * - Rising star indicators
 * - Mobile-responsive design
 * - Accessibility compliant
 */
export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentSupplier,
  filters,
  onFiltersChange,
  className,
}) => {
  // State for leaderboard display
  const [selectedLeaderboardType, setSelectedLeaderboardType] =
    useState<LeaderboardType>('conversions');
  const [showFilters, setShowFilters] = useState(false);
  const [entries] = useState<LeaderboardEntry[]>(mockLeaderboardData); // In real app, fetch based on filters

  // Leaderboard type configurations
  const leaderboardTypes = [
    {
      type: 'conversions' as LeaderboardType,
      label: 'Most Conversions',
      description: 'Suppliers with most successful referrals',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      type: 'total_referrals' as LeaderboardType,
      label: 'Most Referrals',
      description: 'Most active referrers',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      type: 'conversion_rate' as LeaderboardType,
      label: 'Best Conversion Rate',
      description: 'Highest success percentage',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      type: 'rewards_earned' as LeaderboardType,
      label: 'Top Earners',
      description: 'Most rewards earned',
      icon: Trophy,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      type: 'recent_activity' as LeaderboardType,
      label: 'Most Active',
      description: 'Active in last 30 days',
      icon: Zap,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  // Category options
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'photography', label: 'Photography' },
    { value: 'videography', label: 'Videography' },
    { value: 'venue', label: 'Venues' },
    { value: 'catering', label: 'Catering' },
    { value: 'florist', label: 'Florists' },
    { value: 'music', label: 'Music & Entertainment' },
    { value: 'planning', label: 'Wedding Planning' },
    { value: 'transport', label: 'Transport' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'beauty', label: 'Beauty & Hair' },
    { value: 'other', label: 'Other Services' },
  ];

  // Time period options
  const timePeriodOptions = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' },
  ];

  // Get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Star className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get trend indicator
  const getTrendIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ChevronUp className="h-4 w-4" />
          <span className="text-xs font-medium">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ChevronDown className="h-4 w-4" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    } else {
      return <span className="text-xs text-gray-400 font-medium">-</span>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Get score based on leaderboard type
  const getScore = (entry: LeaderboardEntry, type: LeaderboardType) => {
    switch (type) {
      case 'conversions':
        return `${entry.stats.conversions} conversions`;
      case 'total_referrals':
        return `${entry.stats.referrals_sent} referrals`;
      case 'conversion_rate':
        return `${entry.stats.conversion_rate.toFixed(1)}% rate`;
      case 'rewards_earned':
        return formatCurrency(entry.stats.rewards_earned);
      case 'recent_activity':
        return `${entry.stats.referrals_sent} active`;
      default:
        return entry.score.toString();
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Trophy className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Referral Leaderboards
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          See how you compare with other wedding suppliers. Multiple ways to
          excel - find your strength and celebrate your success!
        </p>
      </div>

      {/* Leaderboard Type Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {leaderboardTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedLeaderboardType === type.type;

          return (
            <button
              key={type.type}
              onClick={() => setSelectedLeaderboardType(type.type)}
              className={cn(
                'p-4 text-center border rounded-xl transition-all hover:shadow-md',
                isSelected
                  ? 'border-primary-600 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <div
                className={cn(
                  'mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2',
                  isSelected ? 'bg-primary-100' : type.bgColor,
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isSelected ? 'text-primary-600' : type.color,
                  )}
                />
              </div>
              <h3
                className={cn(
                  'font-medium text-sm',
                  isSelected ? 'text-primary-900' : 'text-gray-900',
                )}
              >
                {type.label}
              </h3>
              <p className="text-xs text-gray-600 mt-1 hidden sm:block">
                {type.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:w-auto',
              showFilters ? 'block' : 'hidden sm:grid',
            )}
          >
            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Category
              </Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    category:
                      value === 'all' ? undefined : (value as SupplierCategory),
                  })
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Period Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Time Period
              </Label>
              <Select
                value={filters.time_period}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    time_period: value as TimePeriod,
                  })
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Location
              </Label>
              <Select
                value={filters.location?.region || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    location: value === 'all' ? undefined : { region: value },
                  })
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Greater London">London</SelectItem>
                  <SelectItem value="South East">South East</SelectItem>
                  <SelectItem value="South West">South West</SelectItem>
                  <SelectItem value="West Midlands">West Midlands</SelectItem>
                  <SelectItem value="East Midlands">East Midlands</SelectItem>
                  <SelectItem value="Yorkshire">Yorkshire</SelectItem>
                  <SelectItem value="North West">North West</SelectItem>
                  <SelectItem value="North East">North East</SelectItem>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Wales">Wales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {getRankIcon(1)}
            {
              leaderboardTypes.find((t) => t.type === selectedLeaderboardType)
                ?.label
            }{' '}
            Leaderboard
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {
              leaderboardTypes.find((t) => t.type === selectedLeaderboardType)
                ?.description
            }
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {entries.map((entry, index) => (
            <div
              key={entry.supplier_id}
              className={cn(
                'p-6 hover:bg-gray-50 transition-colors',
                entry.is_current_user &&
                  'bg-primary-50 border-l-4 border-l-primary-600',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8">
                    {entry.rank <= 3 ? (
                      getRankIcon(entry.rank)
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={entry.profile_image_url}
                      alt={entry.supplier_name}
                    />
                    <AvatarFallback className="bg-primary-100 text-primary-700 font-semibold">
                      {entry.supplier_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>

                  {/* Supplier Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {entry.supplier_name}
                      </h4>
                      {entry.is_current_user && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          You
                        </Badge>
                      )}
                      {entry.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            entry.badge.color === 'gold' &&
                              'bg-yellow-100 text-yellow-800',
                            entry.badge.color === 'silver' &&
                              'bg-gray-100 text-gray-800',
                            entry.badge.color === 'platinum' &&
                              'bg-purple-100 text-purple-800',
                          )}
                        >
                          <Award className="h-3 w-3 mr-1" />
                          {entry.badge.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span className="capitalize">
                        {entry.supplier_category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {entry.location.city}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {getScore(entry, selectedLeaderboardType)}
                  </p>

                  <div className="flex items-center justify-end space-x-4 mt-1">
                    {/* Trend */}
                    <div className="flex items-center">
                      {getTrendIndicator(entry.change_from_last_period)}
                    </div>

                    {/* Additional Stats */}
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>{entry.stats.referrals_sent} sent</div>
                      <div>{entry.stats.conversion_rate.toFixed(1)}% rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded stats for current user */}
              {entry.is_current_user && (
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sent</p>
                      <p className="text-lg font-bold text-gray-900">
                        {entry.stats.referrals_sent}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Converted
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {entry.stats.conversions}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Success Rate
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {entry.stats.conversion_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Rewards
                      </p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(entry.stats.rewards_earned)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Showing top {entries.length} suppliers • Updated every 15 minutes
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Rankings are based on verified conversions and activity in the
            selected time period
          </p>
        </div>
      </Card>

      {/* Encouragement Message */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center">
          <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-purple-900 mb-2">
            Every Referral Matters!
          </h3>
          <p className="text-sm text-purple-800 max-w-lg mx-auto">
            Whether you're #1 or #100, you're building the wedding community.
            Keep connecting great suppliers with amazing couples - together we
            make weddings magical! ✨
          </p>
        </div>
      </Card>
    </div>
  );
};

// Label component helper (if not available in ui components)
const Label: React.FC<{
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}> = ({ children, className, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className={cn('text-sm font-medium text-gray-700', className)}
  >
    {children}
  </label>
);

export default LeaderboardView;
