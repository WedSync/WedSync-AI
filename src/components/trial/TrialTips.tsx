/**
 * WS-140 Trial Management System - Round 2: Trial Tips Component
 * Smart contextual tips based on current activity and progress
 * Provides intelligent suggestions to help users maximize their trial experience
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import {
  Lightbulb,
  X,
  ChevronRight,
  Clock,
  Zap,
  Target,
  Sparkles,
  CheckCircle,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Users,
  Calendar,
  Mail,
  FileText,
  Settings,
  Star,
} from 'lucide-react';
import { TrialProgress, MilestoneType, BusinessType } from '@/types/trial';

interface TrialTip {
  id: string;
  title: string;
  description: string;
  category:
    | 'productivity'
    | 'feature'
    | 'milestone'
    | 'optimization'
    | 'engagement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTimeSaving: number; // in minutes
  actionUrl?: string;
  actionLabel?: string;
  dismissible: boolean;
  context: {
    businessType?: BusinessType[];
    daysInTrial?: number[];
    milestoneType?: MilestoneType[];
    featureUsage?: string[];
  };
}

const tipIcons = {
  productivity: TrendingUp,
  feature: Sparkles,
  milestone: Target,
  optimization: Zap,
  engagement: Users,
};

const priorityColors = {
  low: 'border-gray-200 bg-gray-50',
  medium: 'border-blue-200 bg-blue-50',
  high: 'border-amber-200 bg-amber-50',
  urgent: 'border-red-200 bg-red-50',
};

const priorityTextColors = {
  low: 'text-gray-700',
  medium: 'text-blue-700',
  high: 'text-amber-700',
  urgent: 'text-red-700',
};

const SMART_TIPS: TrialTip[] = [
  {
    id: 'first-client-setup',
    title: 'Ready to add your first client?',
    description:
      'Setting up your first client profile takes 3 minutes but saves hours in communication. Start with one upcoming wedding.',
    category: 'milestone',
    priority: 'high',
    estimatedTimeSaving: 120,
    actionUrl: '/clients/new',
    actionLabel: 'Add Client',
    dismissible: true,
    context: {
      daysInTrial: [1, 2, 3],
      milestoneType: ['first_client_connected'],
    },
  },
  {
    id: 'automate-first-journey',
    title: 'Automate your client communication',
    description:
      'Create your first client journey to automatically send welcome emails, timelines, and check-ins. Save 2+ hours per client.',
    category: 'feature',
    priority: 'high',
    estimatedTimeSaving: 180,
    actionUrl: '/journeys/builder',
    actionLabel: 'Create Journey',
    dismissible: true,
    context: {
      businessType: ['wedding_planner', 'coordinator'],
      daysInTrial: [2, 3, 4, 5],
    },
  },
  {
    id: 'import-guest-list',
    title: 'Import your guest lists efficiently',
    description:
      'Upload CSV files or connect with existing tools to import guest lists in seconds instead of manual entry.',
    category: 'productivity',
    priority: 'medium',
    estimatedTimeSaving: 90,
    actionUrl: '/guests/import',
    actionLabel: 'Import Guests',
    dismissible: true,
    context: {
      daysInTrial: [3, 4, 5, 6],
      featureUsage: ['client_onboarding'],
    },
  },
  {
    id: 'vendor-network',
    title: 'Build your vendor network',
    description:
      'Add trusted vendors to streamline coordination and get better rates through our partnership program.',
    category: 'engagement',
    priority: 'medium',
    estimatedTimeSaving: 60,
    actionUrl: '/vendors',
    actionLabel: 'Add Vendors',
    dismissible: true,
    context: {
      businessType: ['wedding_planner', 'coordinator', 'venue'],
      daysInTrial: [5, 6, 7, 8, 9, 10],
    },
  },
  {
    id: 'timeline-templates',
    title: 'Use timeline templates',
    description:
      'Start with our proven wedding timeline templates and customize them. Save 3 hours of planning per wedding.',
    category: 'productivity',
    priority: 'high',
    estimatedTimeSaving: 180,
    actionUrl: '/timelines/templates',
    actionLabel: 'Browse Templates',
    dismissible: true,
    context: {
      daysInTrial: [4, 5, 6, 7, 8],
    },
  },
  {
    id: 'email-automation',
    title: 'Set up email automation',
    description:
      'Automated follow-ups reduce no-shows by 40% and save 30 minutes per client interaction.',
    category: 'optimization',
    priority: 'high',
    estimatedTimeSaving: 240,
    actionUrl: '/settings/automation',
    actionLabel: 'Setup Automation',
    dismissible: true,
    context: {
      daysInTrial: [7, 8, 9, 10, 11, 12],
      featureUsage: ['email_automation'],
    },
  },
  {
    id: 'trial-ending-soon',
    title: 'Your trial ends in 5 days',
    description:
      'Upgrade now to keep all your data, client relationships, and automations. Plus get 20% off your first month.',
    category: 'engagement',
    priority: 'urgent',
    estimatedTimeSaving: 0,
    actionUrl: '/billing/upgrade',
    actionLabel: 'Upgrade Now',
    dismissible: false,
    context: {
      daysInTrial: [25, 26, 27, 28, 29],
    },
  },
  {
    id: 'mobile-app-tip',
    title: 'Download the mobile app',
    description:
      'Stay connected with clients on-the-go. Get instant notifications and respond 3x faster.',
    category: 'productivity',
    priority: 'medium',
    estimatedTimeSaving: 45,
    actionUrl: '/mobile',
    actionLabel: 'Get App',
    dismissible: true,
    context: {
      daysInTrial: [10, 11, 12, 13, 14, 15],
    },
  },
  {
    id: 'team-collaboration',
    title: 'Invite your team',
    description:
      'Add team members to collaborate on weddings. Teams that work together complete tasks 50% faster.',
    category: 'engagement',
    priority: 'medium',
    estimatedTimeSaving: 120,
    actionUrl: '/team/invite',
    actionLabel: 'Invite Team',
    dismissible: true,
    context: {
      businessType: ['wedding_planner', 'venue', 'coordinator'],
      daysInTrial: [8, 9, 10, 11, 12, 13, 14],
    },
  },
];

interface TrialTipsProps {
  trialProgress?: TrialProgress;
  businessType?: BusinessType;
  className?: string;
  maxTips?: number;
  showPriorityBadge?: boolean;
  onTipAction?: (tip: TrialTip) => void;
  onTipDismiss?: (tipId: string) => void;
}

function TipCard({
  tip,
  onAction,
  onDismiss,
  showAnimation = true,
}: {
  tip: TrialTip;
  onAction?: (tip: TrialTip) => void;
  onDismiss?: (tipId: string) => void;
  showAnimation?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const Icon = tipIcons[tip.category];

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => onDismiss?.(tip.id), 300);
  };

  const handleAction = () => {
    onAction?.(tip);
  };

  if (dismissed) return null;

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, y: 20, scale: 0.95 } : {}}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card
        className={`p-4 transition-all duration-200 ${priorityColors[tip.priority]} border-l-4 border-l-primary-500 hover:shadow-md`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Icon */}
            <motion.div
              whileHover={{ rotate: 5 }}
              className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0"
            >
              <Icon className="w-5 h-5 text-primary-600" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4
                  className={`font-semibold ${priorityTextColors[tip.priority]}`}
                >
                  {tip.title}
                </h4>
                <div className="flex items-center space-x-2 ml-2">
                  <Badge
                    variant={
                      tip.priority === 'urgent'
                        ? 'error'
                        : tip.priority === 'high'
                          ? 'warning'
                          : 'secondary'
                    }
                    size="sm"
                  >
                    {tip.priority}
                  </Badge>
                  {tip.dismissible && (
                    <button
                      onClick={handleDismiss}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p
                className={`text-sm mb-3 ${priorityTextColors[tip.priority]} opacity-90`}
              >
                {tip.description}
              </p>

              {/* Metrics */}
              <div className="flex items-center space-x-4 mb-3">
                {tip.estimatedTimeSaving > 0 && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">
                      Save {tip.estimatedTimeSaving}min
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Lightbulb className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-gray-600 capitalize">
                    {tip.category} tip
                  </span>
                </div>
              </div>

              {/* Action button */}
              {tip.actionLabel && (
                <motion.div whileHover={{ x: 2 }}>
                  <Button
                    size="sm"
                    variant={tip.priority === 'urgent' ? 'primary' : 'outline'}
                    onClick={handleAction}
                    className="font-medium"
                  >
                    {tip.actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function TrialTips({
  trialProgress,
  businessType,
  className = '',
  maxTips = 3,
  showPriorityBadge = true,
  onTipAction,
  onTipDismiss,
}: TrialTipsProps) {
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [visibleTips, setVisibleTips] = useState<TrialTip[]>([]);

  useEffect(() => {
    if (!trialProgress) return;

    // Filter tips based on context
    const daysElapsed = trialProgress.days_elapsed;
    const completedMilestoneTypes = trialProgress.milestones_achieved.map(
      (m) => m.milestone_type,
    );
    const pendingMilestoneTypes = trialProgress.milestones_remaining.map(
      (m) => m.milestone_type,
    );

    const relevantTips = SMART_TIPS.filter((tip) => {
      // Skip dismissed tips
      if (dismissedTips.includes(tip.id)) return false;

      // Check day range
      if (
        tip.context.daysInTrial &&
        !tip.context.daysInTrial.includes(daysElapsed)
      ) {
        return false;
      }

      // Check business type
      if (
        tip.context.businessType &&
        businessType &&
        !tip.context.businessType.includes(businessType)
      ) {
        return false;
      }

      // Check milestone context
      if (tip.context.milestoneType) {
        const hasRelevantMilestone = tip.context.milestoneType.some(
          (mt) =>
            pendingMilestoneTypes.includes(mt) ||
            completedMilestoneTypes.includes(mt),
        );
        if (!hasRelevantMilestone) return false;
      }

      return true;
    });

    // Sort by priority
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const sortedTips = relevantTips.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
    );

    setVisibleTips(sortedTips.slice(0, maxTips));
  }, [trialProgress, businessType, dismissedTips, maxTips]);

  const handleTipDismiss = (tipId: string) => {
    setDismissedTips((prev) => [...prev, tipId]);
    onTipDismiss?.(tipId);
  };

  const handleTipAction = (tip: TrialTip) => {
    onTipAction?.(tip);
    if (tip.actionUrl) {
      window.location.href = tip.actionUrl;
    }
  };

  if (visibleTips.length === 0) {
    return null;
  }

  const totalTimeSavings = visibleTips.reduce(
    (acc, tip) => acc + tip.estimatedTimeSaving,
    0,
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Tips</h3>
          <Badge variant="secondary" size="sm">
            {visibleTips.length}
          </Badge>
        </div>
        {totalTimeSavings > 0 && (
          <div className="flex items-center space-x-1 text-sm text-green-600 font-medium">
            <Clock className="w-4 h-4" />
            <span>Potential: {Math.round(totalTimeSavings / 60)}h saved</span>
          </div>
        )}
      </motion.div>

      {/* Tips */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleTips.map((tip, index) => (
            <TipCard
              key={tip.id}
              tip={tip}
              onAction={handleTipAction}
              onDismiss={handleTipDismiss}
              showAnimation={index < 3} // Only animate first 3 tips
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Show all tips toggle */}
      {SMART_TIPS.length - dismissedTips.length > maxTips && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              /* TODO: Show all tips modal */
            }}
            className="text-gray-600"
          >
            <BookOpen className="w-4 h-4 mr-1" />
            View all tips ({SMART_TIPS.length -
              dismissedTips.length -
              maxTips}{' '}
            more)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
