'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Award,
  Verified,
  Users,
  Calendar,
  Camera,
  ThumbsUp,
  Heart,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Filter,
  BarChart3,
} from 'lucide-react';

interface ReviewScore {
  minRating?: number;
  minReviews?: number;
  recentOnly?: boolean;
  verifiedOnly?: boolean;
  withPhotos?: boolean;
  responseRequired?: boolean;
  sortByReviews?: 'rating' | 'count' | 'recent';
}

interface ReviewScoreFilterProps {
  reviewScore: ReviewScore;
  onChange: (reviewScore: ReviewScore) => void;
  className?: string;
  compact?: boolean;
  showInsights?: boolean;
  showFilters?: boolean;
}

interface RatingBand {
  id: string;
  name: string;
  min: number;
  description: string;
  quality: string;
  percentage?: number;
}

interface ReviewInsight {
  metric: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}

const RATING_BANDS: RatingBand[] = [
  {
    id: 'excellent',
    name: 'Excellent',
    min: 4.5,
    description: 'Exceptional service with outstanding reviews',
    quality: 'Premium',
    percentage: 25,
  },
  {
    id: 'very-good',
    name: 'Very Good',
    min: 4.0,
    description: 'High-quality service with great customer satisfaction',
    quality: 'High Quality',
    percentage: 35,
  },
  {
    id: 'good',
    name: 'Good',
    min: 3.5,
    description: 'Solid service with satisfied customers',
    quality: 'Good Value',
    percentage: 25,
  },
  {
    id: 'fair',
    name: 'Fair',
    min: 3.0,
    description: 'Adequate service with mixed reviews',
    quality: 'Budget',
    percentage: 15,
  },
];

const REVIEW_COUNT_RANGES = [
  {
    id: 'any',
    name: 'Any',
    min: 0,
    description: 'All vendors regardless of review count',
  },
  {
    id: 'few',
    name: '5+ Reviews',
    min: 5,
    description: 'Vendors with basic review history',
  },
  {
    id: 'moderate',
    name: '20+ Reviews',
    min: 20,
    description: 'Well-reviewed vendors',
  },
  {
    id: 'many',
    name: '50+ Reviews',
    min: 50,
    description: 'Extensively reviewed vendors',
  },
  {
    id: 'extensive',
    name: '100+ Reviews',
    min: 100,
    description: 'Highly experienced vendors',
  },
];

const SORT_OPTIONS = [
  {
    value: 'rating',
    label: 'Highest Rated First',
    icon: <Star className="w-4 h-4" />,
  },
  {
    value: 'count',
    label: 'Most Reviewed First',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    value: 'recent',
    label: 'Recently Reviewed First',
    icon: <Calendar className="w-4 h-4" />,
  },
];

export function ReviewScoreFilter({
  reviewScore,
  onChange,
  className,
  compact = false,
  showInsights = true,
  showFilters = true,
}: ReviewScoreFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle rating changes
  const handleMinRatingChange = (rating: number) => {
    onChange({
      ...reviewScore,
      minRating: rating === 0 ? undefined : rating,
    });
  };

  const handleMinReviewsChange = (count: string) => {
    onChange({
      ...reviewScore,
      minReviews: count ? parseInt(count) : undefined,
    });
  };

  const handleRatingBandSelect = (band: RatingBand) => {
    onChange({
      ...reviewScore,
      minRating: band.min,
    });
  };

  const handleReviewCountRangeSelect = (
    range: (typeof REVIEW_COUNT_RANGES)[0],
  ) => {
    onChange({
      ...reviewScore,
      minReviews: range.min === 0 ? undefined : range.min,
    });
  };

  // Clear filters
  const clearReviewFilters = () => {
    onChange({
      minRating: undefined,
      minReviews: undefined,
      recentOnly: false,
      verifiedOnly: false,
      withPhotos: false,
      responseRequired: false,
      sortByReviews: 'rating',
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return !!(
      reviewScore.minRating ||
      reviewScore.minReviews ||
      reviewScore.recentOnly ||
      reviewScore.verifiedOnly ||
      reviewScore.withPhotos ||
      reviewScore.responseRequired
    );
  };

  // Get current rating band
  const getCurrentRatingBand = () => {
    if (!reviewScore.minRating) return null;
    return (
      RATING_BANDS.find((band) => reviewScore.minRating >= band.min) ||
      RATING_BANDS[RATING_BANDS.length - 1]
    );
  };

  // Get current review count range
  const getCurrentReviewCountRange = () => {
    if (!reviewScore.minReviews) return REVIEW_COUNT_RANGES[0];
    const ranges = [...REVIEW_COUNT_RANGES].reverse();
    return (
      ranges.find((range) => reviewScore.minReviews >= range.min) ||
      REVIEW_COUNT_RANGES[0]
    );
  };

  // Generate review insights
  const getReviewInsights = (): ReviewInsight[] => {
    const currentBand = getCurrentRatingBand();
    const currentRange = getCurrentReviewCountRange();

    return [
      {
        metric: 'Quality Level',
        value: currentBand?.quality || 'All Levels',
        description: currentBand?.description || 'No minimum rating filter',
        icon: <Star className="w-4 h-4" />,
        trend: currentBand ? 'up' : 'stable',
      },
      {
        metric: 'Review Volume',
        value: currentRange?.name || 'Any',
        description: currentRange?.description || 'All vendors included',
        icon: <MessageSquare className="w-4 h-4" />,
        trend: (reviewScore.minReviews || 0) > 20 ? 'up' : 'stable',
      },
      {
        metric: 'Vendor Pool',
        value: currentBand?.percentage ? `~${currentBand.percentage}%` : '100%',
        description: 'Of available vendors match criteria',
        icon: <Users className="w-4 h-4" />,
        trend: currentBand?.percentage < 50 ? 'down' : 'stable',
      },
      {
        metric: 'Reliability',
        value: reviewScore.verifiedOnly
          ? 'High'
          : reviewScore.minRating >= 4.0
            ? 'Good'
            : 'Standard',
        description: 'Based on review authenticity and scores',
        icon: <Award className="w-4 h-4" />,
        trend:
          reviewScore.verifiedOnly || (reviewScore.minRating || 0) >= 4.0
            ? 'up'
            : 'stable',
      },
    ];
  };

  const insights = getReviewInsights();

  return (
    <Card className={cn('space-y-4', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-base flex items-center space-x-2',
              compact && 'text-sm',
            )}
          >
            <Star className="w-4 h-4" />
            <span>Reviews & Ratings</span>
            {hasActiveFilters() && (
              <Badge variant="secondary" className="text-xs">
                {[
                  reviewScore.minRating ? 1 : 0,
                  reviewScore.minReviews ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}{' '}
                filters
              </Badge>
            )}
          </CardTitle>

          {hasActiveFilters() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearReviewFilters}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Rating</Label>

          <div className="space-y-3">
            {/* Star Rating Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMinRatingChange(rating)}
                    className={cn(
                      'p-1',
                      (reviewScore.minRating || 0) >= rating
                        ? 'text-yellow-500'
                        : 'text-gray-300',
                    )}
                  >
                    <Star
                      className={cn(
                        'w-6 h-6',
                        (reviewScore.minRating || 0) >= rating &&
                          'fill-current',
                      )}
                    />
                  </Button>
                ))}
              </div>

              <div className="text-sm text-gray-600">
                {reviewScore.minRating
                  ? `${reviewScore.minRating}+ stars`
                  : 'Any rating'}
              </div>
            </div>

            {/* Rating Slider */}
            <div className="px-2">
              <Slider
                value={[reviewScore.minRating || 0]}
                onValueChange={([value]) => handleMinRatingChange(value)}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Any rating</span>
                <span>5 stars only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Rating Bands */}
        {!compact && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quality Levels</Label>
            <div className="grid grid-cols-2 gap-2">
              {RATING_BANDS.map((band) => {
                const isSelected = reviewScore.minRating === band.min;

                return (
                  <Button
                    key={band.id}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleRatingBandSelect(band)}
                    className="h-auto p-3 flex flex-col items-start text-left"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: Math.floor(band.min) }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-yellow-400 text-yellow-400"
                            />
                          ),
                        )}
                        {band.min % 1 !== 0 && (
                          <Star className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{band.name}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {band.description}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <Badge variant="secondary" className="text-xs">
                        {band.quality}
                      </Badge>
                      {band.percentage && (
                        <span className="text-xs text-gray-500">
                          ~{band.percentage}% of vendors
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <Separator />

        {/* Review Count Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Reviews</Label>

          <div className="space-y-3">
            <Input
              type="number"
              placeholder="e.g., 10"
              value={reviewScore.minReviews || ''}
              onChange={(e) => handleMinReviewsChange(e.target.value)}
              min="0"
            />

            {/* Quick Review Count Options */}
            <div className="grid grid-cols-2 gap-2">
              {REVIEW_COUNT_RANGES.slice(1).map((range) => {
                const isSelected = reviewScore.minReviews === range.min;

                return (
                  <Button
                    key={range.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleReviewCountRangeSelect(range)}
                    className="text-xs"
                  >
                    {range.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {showFilters && (
          <>
            <Separator />

            {/* Review Quality Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Review Quality</Label>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="verified-only"
                    checked={reviewScore.verifiedOnly || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...reviewScore,
                        verifiedOnly: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="verified-only"
                    className="text-sm flex items-center space-x-1"
                  >
                    <Verified className="w-4 h-4 text-blue-500" />
                    <span>Verified reviews only</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="with-photos"
                    checked={reviewScore.withPhotos || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...reviewScore,
                        withPhotos: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="with-photos"
                    className="text-sm flex items-center space-x-1"
                  >
                    <Camera className="w-4 h-4 text-green-500" />
                    <span>Reviews with photos</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="recent-only"
                    checked={reviewScore.recentOnly || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...reviewScore,
                        recentOnly: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="recent-only"
                    className="text-sm flex items-center space-x-1"
                  >
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Recent reviews only (last 12 months)</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="response-required"
                    checked={reviewScore.responseRequired || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...reviewScore,
                        responseRequired: checked,
                      })
                    }
                  />
                  <Label
                    htmlFor="response-required"
                    className="text-sm flex items-center space-x-1"
                  >
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    <span>Vendor responses to reviews</span>
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sort Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Sort by Reviews</Label>
              <Select
                value={reviewScore.sortByReviews || 'rating'}
                onValueChange={(value) =>
                  onChange({
                    ...reviewScore,
                    sortByReviews: value as any,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Current Filters Summary */}
        {hasActiveFilters() && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Active Filters</Label>

              <div className="space-y-2">
                {reviewScore.minRating && (
                  <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                    <Star className="w-4 h-4 text-yellow-600 fill-current" />
                    <span className="text-sm">
                      Minimum {reviewScore.minRating} star rating
                    </span>
                  </div>
                )}

                {reviewScore.minReviews && (
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">
                      At least {reviewScore.minReviews} reviews
                    </span>
                  </div>
                )}

                {reviewScore.verifiedOnly && (
                  <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                    <Verified className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Verified reviews only</span>
                  </div>
                )}

                {reviewScore.withPhotos && (
                  <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Reviews with photos</span>
                  </div>
                )}

                {reviewScore.recentOnly && (
                  <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">Recent reviews only</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Review Insights */}
        {showInsights && !compact && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Filter Impact</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-600">{insight.icon}</div>
                        <span className="text-xs text-gray-600">
                          {insight.metric}
                        </span>
                      </div>
                      {insight.trend === 'up' && (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      )}
                    </div>

                    <div className="font-semibold text-sm text-gray-900 mb-1">
                      {insight.value}
                    </div>

                    <div className="text-xs text-gray-600">
                      {insight.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tips and Recommendations */}
        {!compact &&
          (reviewScore.minRating >= 4.5 || reviewScore.minReviews >= 50) && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Tip:</strong> These are high standards that will show
                you the best vendors, but you might want to consider slightly
                lower thresholds to see more options.
              </div>
            </div>
          )}

        {hasActiveFilters() && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={clearReviewFilters}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Review Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReviewScoreFilter;
