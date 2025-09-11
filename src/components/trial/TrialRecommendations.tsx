/**
 * WS-140 Trial Management System - Round 2: Trial Recommendations Component
 * Intelligent feature recommendations based on usage patterns and trial progress
 * Helps users discover high-value features and maximize trial ROI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import {
  Compass,
  TrendingUp,
  Zap,
  Clock,
  Star,
  ArrowRight,
  Lightbulb,
  Target,
  Users,
  Mail,
  Calendar,
  FileText,
  Settings,
  Workflow,
  BarChart3,
  MessageSquare,
  Camera,
  Music,
  Palette,
  Gift,
  Crown,
  Rocket,
  ChevronRight,
  BookOpen,
  PlayCircle,
} from 'lucide-react';
import { TrialProgress, BusinessType, MilestoneType } from '@/types/trial';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category:
    | 'essential'
    | 'advanced'
    | 'automation'
    | 'integration'
    | 'optimization';
  priority: 1 | 2 | 3 | 4 | 5; // 5 = highest
  estimatedTimeSavings: number; // hours per week
  setupTimeMinutes: number;
  roi: number; // weekly ROI percentage
  icon: React.ComponentType<any>;
  actionUrl: string;
  actionLabel: string;
  videoUrl?: string;
  dependencies?: string[]; // features that should be set up first
  businessTypes: BusinessType[];
  context: {
    currentMilestones?: MilestoneType[];
    trialDayRange?: [number, number];
    completedFeatures?: string[];
    missingFeatures?: string[];
  };
}

const INTELLIGENT_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'client-journey-automation',
    title: 'Automate Client Journeys',
    description:
      'Set up automated email sequences that nurture clients from inquiry to wedding day. Reduce manual follow-ups by 80%.',
    category: 'automation',
    priority: 5,
    estimatedTimeSavings: 8,
    setupTimeMinutes: 20,
    roi: 250,
    icon: Workflow,
    actionUrl: '/journeys/templates',
    actionLabel: 'Setup Automation',
    videoUrl: '/videos/journey-setup.mp4',
    dependencies: ['first_client_connected'],
    businessTypes: ['wedding_planner', 'coordinator', 'venue'],
    context: {
      currentMilestones: ['first_client_connected'],
      trialDayRange: [3, 15],
      missingFeatures: ['email_automation'],
    },
  },
  {
    id: 'vendor-network',
    title: 'Build Your Vendor Network',
    description:
      'Connect with trusted vendors for faster coordination and better rates. Save 3 hours per wedding on vendor management.',
    category: 'essential',
    priority: 4,
    estimatedTimeSavings: 3,
    setupTimeMinutes: 15,
    roi: 180,
    icon: Users,
    actionUrl: '/vendors/discover',
    actionLabel: 'Find Vendors',
    businessTypes: ['wedding_planner', 'coordinator'],
    context: {
      trialDayRange: [5, 20],
      completedFeatures: ['client_onboarding'],
    },
  },
  {
    id: 'timeline-templates',
    title: 'Use Timeline Templates',
    description:
      'Start with proven wedding timeline templates. Create comprehensive timelines in 10 minutes instead of 2 hours.',
    category: 'essential',
    priority: 5,
    estimatedTimeSavings: 6,
    setupTimeMinutes: 10,
    roi: 300,
    icon: Calendar,
    actionUrl: '/timelines/templates',
    actionLabel: 'Browse Templates',
    videoUrl: '/videos/timeline-setup.mp4',
    businessTypes: ['wedding_planner', 'coordinator', 'venue'],
    context: {
      trialDayRange: [2, 12],
      missingFeatures: ['timeline_management'],
    },
  },
  {
    id: 'guest-management-system',
    title: 'Advanced Guest Management',
    description:
      'Import guest lists, track RSVPs, and send automated reminders. Handle 500+ guests effortlessly.',
    category: 'advanced',
    priority: 3,
    estimatedTimeSavings: 4,
    setupTimeMinutes: 25,
    roi: 200,
    icon: MessageSquare,
    actionUrl: '/guests/advanced',
    actionLabel: 'Setup Guest System',
    businessTypes: ['wedding_planner', 'venue', 'coordinator'],
    context: {
      trialDayRange: [7, 25],
      completedFeatures: ['first_client_connected'],
    },
  },
  {
    id: 'budget-tracking',
    title: 'Smart Budget Tracking',
    description:
      'Track expenses, compare vendor quotes, and get budget alerts. Keep weddings on budget with automated insights.',
    category: 'optimization',
    priority: 4,
    estimatedTimeSavings: 2,
    setupTimeMinutes: 15,
    roi: 150,
    icon: BarChart3,
    actionUrl: '/budgets/setup',
    actionLabel: 'Track Budgets',
    businessTypes: ['wedding_planner', 'coordinator'],
    context: {
      trialDayRange: [10, 30],
      completedFeatures: ['vendor_added'],
    },
  },
  {
    id: 'photo-sharing-portal',
    title: 'Client Photo Portal',
    description:
      'Share photos securely with clients and vendors. Get feedback 3x faster with organized galleries.',
    category: 'advanced',
    priority: 3,
    estimatedTimeSavings: 2,
    setupTimeMinutes: 20,
    roi: 120,
    icon: Camera,
    actionUrl: '/photos/portal',
    actionLabel: 'Setup Portal',
    businessTypes: ['photographer', 'wedding_planner'],
    context: {
      trialDayRange: [12, 30],
      completedFeatures: ['client_onboarding'],
    },
  },
  {
    id: 'music-coordination',
    title: 'Music & Entertainment Hub',
    description:
      'Coordinate with DJs, bands, and musicians. Share playlists and timing requirements seamlessly.',
    category: 'integration',
    priority: 2,
    estimatedTimeSavings: 1.5,
    setupTimeMinutes: 15,
    roi: 80,
    icon: Music,
    actionUrl: '/music/setup',
    actionLabel: 'Setup Music Hub',
    businessTypes: ['wedding_planner', 'dj_band', 'venue'],
    context: {
      trialDayRange: [15, 30],
      completedFeatures: ['timeline_created'],
    },
  },
  {
    id: 'design-collaboration',
    title: 'Design Collaboration Tools',
    description:
      'Share mood boards, color palettes, and design concepts with clients and vendors in real-time.',
    category: 'advanced',
    priority: 3,
    estimatedTimeSavings: 3,
    setupTimeMinutes: 30,
    roi: 160,
    icon: Palette,
    actionUrl: '/design/collaborate',
    actionLabel: 'Start Designing',
    businessTypes: ['florist', 'wedding_planner', 'venue'],
    context: {
      trialDayRange: [8, 25],
      completedFeatures: ['vendor_added'],
    },
  },
];

const categoryConfig = {
  essential: {
    color: 'text-green-600 bg-green-100',
    label: 'Essential',
    icon: Target,
  },
  advanced: {
    color: 'text-blue-600 bg-blue-100',
    label: 'Advanced',
    icon: Rocket,
  },
  automation: {
    color: 'text-purple-600 bg-purple-100',
    label: 'Automation',
    icon: Zap,
  },
  integration: {
    color: 'text-amber-600 bg-amber-100',
    label: 'Integration',
    icon: Settings,
  },
  optimization: {
    color: 'text-pink-600 bg-pink-100',
    label: 'Optimization',
    icon: TrendingUp,
  },
};

interface TrialRecommendationsProps {
  trialProgress?: TrialProgress;
  businessType?: BusinessType;
  className?: string;
  maxRecommendations?: number;
  showROI?: boolean;
  onRecommendationClick?: (recommendation: Recommendation) => void;
  onWatchVideo?: (videoUrl: string) => void;
}

function RecommendationCard({
  recommendation,
  index,
  onRecommendationClick,
  onWatchVideo,
}: {
  recommendation: Recommendation;
  index: number;
  onRecommendationClick?: (rec: Recommendation) => void;
  onWatchVideo?: (videoUrl: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = recommendation.icon;
  const categoryInfo = categoryConfig[recommendation.category];
  const CategoryIcon = categoryInfo.icon;

  const priorityColors = [
    '',
    'border-gray-300',
    'border-blue-300',
    'border-amber-300',
    'border-green-300',
    'border-purple-500',
  ];
  const priorityBadgeColors = [
    '',
    'secondary',
    'secondary',
    'warning',
    'success',
    'primary',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="cursor-pointer"
    >
      <Card
        className={`p-6 transition-all duration-200 hover:shadow-lg border-l-4 ${priorityColors[recommendation.priority]} group`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <motion.div
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-sm"
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>

            {/* Title and description */}
            <div>
              <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                {recommendation.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {recommendation.description}
              </p>
            </div>
          </div>

          {/* Priority and category badges */}
          <div className="flex flex-col items-end space-y-2">
            <Badge
              variant={priorityBadgeColors[recommendation.priority] as any}
              size="sm"
            >
              Priority {recommendation.priority}
            </Badge>
            <div
              className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${categoryInfo.color}`}
            >
              <CategoryIcon className="w-3 h-3" />
              <span className="font-medium">{categoryInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Clock className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-800">
              {recommendation.estimatedTimeSavings}h/week
            </p>
            <p className="text-xs text-green-600">time saved</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-800">
              {recommendation.roi}%
            </p>
            <p className="text-xs text-blue-600">weekly ROI</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Target className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-purple-800">
              {recommendation.setupTimeMinutes}min
            </p>
            <p className="text-xs text-purple-600">setup time</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {recommendation.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchVideo?.(recommendation.videoUrl!);
                }}
              >
                <PlayCircle className="w-3 h-3 mr-1" />
                Watch Demo
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              {showDetails ? 'Less' : 'More'} Details
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRecommendationClick?.(recommendation);
            }}
            className="group-hover:bg-primary-600"
          >
            {recommendation.actionLabel}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-gray-200 overflow-hidden"
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">
                    Why This Helps:
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • Saves {recommendation.estimatedTimeSavings} hours per
                      week on average
                    </li>
                    <li>
                      • {recommendation.roi}% weekly ROI based on time value
                    </li>
                    <li>
                      • Quick {recommendation.setupTimeMinutes}-minute setup
                      process
                    </li>
                  </ul>
                </div>

                {recommendation.dependencies && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      Prerequisites:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.dependencies.map((dep) => (
                        <Badge key={dep} variant="secondary" size="sm">
                          {dep.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Best For:</h5>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.businessTypes.map((type) => (
                      <Badge key={type} variant="outline" size="sm">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function TrialRecommendations({
  trialProgress,
  businessType,
  className = '',
  maxRecommendations = 4,
  showROI = true,
  onRecommendationClick,
  onWatchVideo,
}: TrialRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<
    'all' | 'essential' | 'advanced' | 'automation'
  >('all');

  useEffect(() => {
    if (!trialProgress) {
      setRecommendations(
        INTELLIGENT_RECOMMENDATIONS.slice(0, maxRecommendations),
      );
      return;
    }

    // Filter recommendations based on trial progress and business type
    const daysElapsed = trialProgress.days_elapsed;
    const completedMilestoneTypes = trialProgress.milestones_achieved.map(
      (m) => m.milestone_type,
    );

    const relevantRecommendations = INTELLIGENT_RECOMMENDATIONS.filter(
      (rec) => {
        // Check business type compatibility
        if (businessType && !rec.businessTypes.includes(businessType)) {
          return false;
        }

        // Check trial day range
        if (rec.context.trialDayRange) {
          const [min, max] = rec.context.trialDayRange;
          if (daysElapsed < min || daysElapsed > max) {
            return false;
          }
        }

        // Check if dependencies are met
        if (rec.dependencies) {
          const hasAllDependencies = rec.dependencies.every((dep) =>
            completedMilestoneTypes.includes(dep as MilestoneType),
          );
          if (!hasAllDependencies) return false;
        }

        return true;
      },
    );

    // Sort by priority (highest first) and ROI
    const sortedRecommendations = relevantRecommendations.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.roi - a.roi;
    });

    setRecommendations(sortedRecommendations.slice(0, maxRecommendations));
  }, [trialProgress, businessType, maxRecommendations]);

  const filteredRecommendations =
    filter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.category === filter);

  const totalPotentialSavings = recommendations.reduce(
    (acc, rec) => acc + rec.estimatedTimeSavings,
    0,
  );
  const averageROI =
    recommendations.length > 0
      ? Math.round(
          recommendations.reduce((acc, rec) => acc + rec.roi, 0) /
            recommendations.length,
        )
      : 0;

  const handleRecommendationClick = (recommendation: Recommendation) => {
    onRecommendationClick?.(recommendation);
    window.location.href = recommendation.actionUrl;
  };

  if (recommendations.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Compass className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Discovering Opportunities
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Keep using WedSync features and we'll provide personalized
              recommendations to help you save even more time.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Compass className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Recommended For You
          </h2>
          <Badge variant="secondary" size="sm">
            {recommendations.length}
          </Badge>
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Recommendations</option>
          <option value="essential">Essential</option>
          <option value="advanced">Advanced</option>
          <option value="automation">Automation</option>
        </select>
      </div>

      {/* Summary metrics */}
      {showROI && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Potential Weekly Savings
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {totalPotentialSavings}h
            </p>
            <p className="text-xs text-green-700">
              by implementing all recommendations
            </p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Average ROI
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{averageROI}%</p>
            <p className="text-xs text-blue-700">return on investment</p>
          </Card>
        </motion.div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredRecommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              index={index}
              onRecommendationClick={handleRecommendationClick}
              onWatchVideo={onWatchVideo}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredRecommendations.length === 0 && filter !== 'all' && (
        <div className="text-center py-8">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No {filter} recommendations available right now.
          </p>
        </div>
      )}
    </div>
  );
}
