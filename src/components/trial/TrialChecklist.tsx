/**
 * WS-167 Trial Management System - Enhanced Trial Onboarding Checklist Component
 * Interactive checklist with activity tracking to guide trial users through key features
 * Follows Untitled UI design patterns with wedding-focused UX and enhanced security
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// useAnimation // useAnimation removed - use motion controls
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { Progress } from '@/components/untitled-ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  CheckCircle,
  Circle,
  Clock,
  Users,
  Calendar,
  Mail,
  Heart,
  MapPin,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Zap,
  Refresh,
  Trophy,
  Star,
  Award,
} from 'lucide-react';
import {
  TrialMilestone,
  MilestoneType,
  MILESTONE_DEFINITIONS,
} from '@/types/trial';
import { sanitizeHTML } from '@/lib/security/input-validation';
import * as animations from '@/components/trial/animations/trial-animations';
import { HelpTooltip } from '@/components/trial/InteractiveTooltips';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  estimatedMinutes: number;
  category: 'setup' | 'clients' | 'automation' | 'collaboration';
  milestone?: MilestoneType;
  actionUrl?: string;
  instructions: string[];
  benefits: string[];
  priority: 'high' | 'medium' | 'low';
  activityScore?: number; // Points awarded for completion
  completedAt?: Date;
}

const ONBOARDING_CHECKLIST: Omit<ChecklistItem, 'completed'>[] = [
  // Setup Category
  {
    id: 'complete-profile',
    title: 'Complete Your Business Profile',
    description: 'Add your business details and branding',
    icon: <Heart className="h-4 w-4" />,
    estimatedMinutes: 5,
    category: 'setup',
    actionUrl: '/settings/profile',
    instructions: [
      'Go to Settings → Business Profile',
      'Upload your business logo and photos',
      'Add your business description and services',
      'Set your location and contact information',
    ],
    benefits: [
      'Professional appearance for clients',
      'Better search visibility',
      'Consistent branding across platform',
    ],
  },
  {
    id: 'add-first-client',
    title: 'Add Your First Client',
    description: 'Import or create your first client profile',
    icon: <Users className="h-4 w-4" />,
    estimatedMinutes: 10,
    category: 'clients',
    milestone: 'first_client_connected',
    actionUrl: '/clients/new',
    instructions: [
      'Navigate to Clients section',
      'Click "Add New Client" button',
      "Fill in couple's details and wedding date",
      'Set up communication preferences',
      'Add wedding venue and budget information',
    ],
    benefits: [
      'Start organizing client information',
      'Access to client-specific features',
      'Foundation for automation setup',
    ],
  },
  {
    id: 'import-guest-list',
    title: 'Import a Guest List',
    description: 'Upload or create your first guest list',
    icon: <FileText className="h-4 w-4" />,
    estimatedMinutes: 15,
    category: 'clients',
    milestone: 'guest_list_imported',
    actionUrl: '/guests/import',
    instructions: [
      'Go to Guest Management',
      'Choose "Import from CSV" or "Add manually"',
      'Map guest information fields correctly',
      'Set up RSVP tracking preferences',
      'Configure dietary restrictions and seating',
    ],
    benefits: [
      'Streamlined guest management',
      'Automated RSVP tracking',
      'Easy seating arrangements',
    ],
  },
  {
    id: 'create-timeline',
    title: 'Build Your First Timeline',
    description: 'Create a wedding timeline with tasks',
    icon: <Calendar className="h-4 w-4" />,
    estimatedMinutes: 20,
    category: 'setup',
    milestone: 'timeline_created',
    actionUrl: '/timeline/new',
    instructions: [
      'Open Timeline Builder',
      'Select a wedding timeline template',
      'Customize tasks and deadlines',
      'Assign tasks to team members',
      'Set up automated reminders',
    ],
    benefits: [
      'Never miss important deadlines',
      'Team coordination and accountability',
      'Professional timeline sharing with clients',
    ],
  },
  {
    id: 'add-vendor',
    title: 'Connect Your First Vendor',
    description: 'Add a vendor partner to collaborate with',
    icon: <MapPin className="h-4 w-4" />,
    estimatedMinutes: 8,
    category: 'collaboration',
    milestone: 'vendor_added',
    actionUrl: '/vendors/new',
    instructions: [
      'Navigate to Vendors section',
      'Click "Add Vendor" button',
      'Enter vendor contact information',
      'Set service categories and specialties',
      'Configure collaboration permissions',
    ],
    benefits: [
      'Streamlined vendor communication',
      'Shared timelines and documents',
      'Professional vendor network',
    ],
  },
  {
    id: 'setup-journey',
    title: 'Create Your First Client Journey',
    description: 'Set up automated communication flow',
    icon: <Mail className="h-4 w-4" />,
    estimatedMinutes: 25,
    category: 'automation',
    milestone: 'initial_journey_created',
    actionUrl: '/journeys/new',
    instructions: [
      'Go to Journey Builder',
      'Choose "Wedding Planning Journey" template',
      'Customize email templates and timing',
      'Set up milestone-based triggers',
      'Test the journey with a sample client',
    ],
    benefits: [
      'Automated client communication',
      'Consistent follow-up process',
      'Time savings on repetitive tasks',
    ],
  },
];

interface TrialChecklistProps {
  milestones?: TrialMilestone[];
  className?: string;
  collapsed?: boolean;
  onItemComplete?: (itemId: string) => void;
  onItemClick?: (item: ChecklistItem) => void;
  showActivityScore?: boolean; // Show activity score tracking
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  onActivityUpdate?: (score: number) => void; // Callback for activity updates
  highlightNextAction?: boolean; // Highlight the next recommended action
}

export function TrialChecklist({
  milestones = [],
  className = '',
  collapsed = false,
  onItemComplete,
  onItemClick,
  showActivityScore = true,
  refreshInterval = 60000, // 60 seconds default
  onActivityUpdate,
  highlightNextAction = true,
}: TrialChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [activityScore, setActivityScore] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completionStreak, setCompletionStreak] = useState<number>(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [celebratingItem, setCelebratingItem] = useState<string | null>(null);
  const [showCompletionCelebration, setShowCompletionCelebration] =
    useState(false);
  const controls = useAnimation();
  const progressRef = useRef<HTMLDivElement>(null);

  // Enhanced checklist initialization with security validation
  useEffect(() => {
    // Merge checklist with milestone completion status and add security validation
    const updatedChecklist = ONBOARDING_CHECKLIST.map((item) => {
      const sanitizedItem = {
        ...item,
        title: sanitizeHTML(item.title),
        description: sanitizeHTML(item.description),
        completed: item.milestone
          ? milestones.some(
              (m) => m.milestone_type === item.milestone && m.achieved,
            )
          : false,
        priority: item.priority || 'medium',
        activityScore: getItemActivityScore(item),
        completedAt: item.milestone
          ? milestones.find(
              (m) => m.milestone_type === item.milestone && m.achieved,
            )?.achieved_at
          : undefined,
      };
      return sanitizedItem;
    });
    setChecklist(updatedChecklist);

    // Calculate and update activity score
    const newActivityScore = calculateChecklistActivityScore(updatedChecklist);
    setActivityScore(newActivityScore);
    onActivityUpdate?.(newActivityScore);
  }, [milestones, onActivityUpdate]);

  // Calculate activity score for individual items
  const getItemActivityScore = useCallback((item: any): number => {
    const baseScore = 10;
    const priorityMultiplier =
      item.priority === 'high' ? 1.5 : item.priority === 'medium' ? 1.2 : 1.0;
    const timeMultiplier = Math.max(0.5, 1.0 - item.estimatedMinutes / 120); // Longer tasks worth less per minute

    return Math.round(baseScore * priorityMultiplier * timeMultiplier);
  }, []);

  // Calculate overall checklist activity score
  const calculateChecklistActivityScore = useCallback(
    (items: ChecklistItem[]): number => {
      if (items.length === 0) return 0;

      const completedItems = items.filter((item) => item.completed);
      const totalPossibleScore = items.reduce(
        (sum, item) => sum + (item.activityScore || 10),
        0,
      );
      const earnedScore = completedItems.reduce(
        (sum, item) => sum + (item.activityScore || 10),
        0,
      );

      return Math.round((earnedScore / totalPossibleScore) * 100);
    },
    [],
  );

  // Auto-refresh functionality
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        setIsRefreshing(true);
        // Simulate refresh by recalculating activity score
        const newActivityScore = calculateChecklistActivityScore(checklist);
        setActivityScore(newActivityScore);
        onActivityUpdate?.(newActivityScore);

        setTimeout(() => setIsRefreshing(false), 1000);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [
    refreshInterval,
    checklist,
    calculateChecklistActivityScore,
    onActivityUpdate,
  ]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = (completedCount / totalCount) * 100;

  const categories = {
    setup: { label: 'Initial Setup', icon: <Heart className="h-4 w-4" /> },
    clients: {
      label: 'Client Management',
      icon: <Users className="h-4 w-4" />,
    },
    automation: { label: 'Automation', icon: <Mail className="h-4 w-4" /> },
    collaboration: {
      label: 'Team & Vendors',
      icon: <MapPin className="h-4 w-4" />,
    },
  };

  const getFilteredItems = () => {
    return selectedCategory
      ? checklist.filter((item) => item.category === selectedCategory)
      : checklist;
  };

  const handleItemClick = (item: ChecklistItem) => {
    if (expandedItem === item.id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(item.id);
    }
    onItemClick?.(item);
  };

  const handleCompleteItem = async (itemId: string) => {
    // Trigger celebration animation
    setCelebratingItem(itemId);

    // Update checklist
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, completed: true, completedAt: new Date() }
          : item,
      ),
    );

    // Trigger progress celebration if milestone
    const completedItem = checklist.find((item) => item.id === itemId);
    if (completedItem?.milestone) {
      await controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.5 },
      });
    }

    // Check for 100% completion
    const newCompletedCount = checklist.filter(
      (item) => item.completed || item.id === itemId,
    ).length;
    if (newCompletedCount === checklist.length) {
      setTimeout(() => setShowCompletionCelebration(true), 500);
    }

    onItemComplete?.(itemId);

    // Clear celebration after animation
    setTimeout(() => setCelebratingItem(null), 2000);
  };

  const handleStartItem = (item: ChecklistItem) => {
    if (item.actionUrl) {
      window.location.href = item.actionUrl;
    }
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`p-4 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg relative">
                <Sparkles className="h-4 w-4 text-primary-600" />
                {isRefreshing && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Getting Started</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>
                    {completedCount} of {totalCount} completed
                  </span>
                  {showActivityScore && activityScore > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-600">
                          {activityScore}% activity
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16">
                <Progress
                  value={completionPercentage}
                  className="h-2 transition-all duration-300"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCollapsed(false)}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={animations.fadeInUp}
    >
      <Card className={`${className} relative overflow-hidden`}>
        {/* Completion Celebration Overlay */}
        <AnimatePresence>
          {showCompletionCelebration && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 via-blue-400/30 to-purple-400/30" />
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1], rotate: [0, 360, 360] }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                <Trophy className="w-32 h-32 text-yellow-500" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg relative">
                <Sparkles className="h-5 w-5 text-primary-600" />
                {isRefreshing && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Getting Started Checklist
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    Complete these steps to maximize your trial experience
                  </span>
                  {showActivityScore && activityScore > 0 && (
                    <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      <Activity className="h-3 w-3" />
                      <span className="font-medium">
                        {activityScore}% engagement score
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>

          {/* Progress Overview */}
          <motion.div
            ref={progressRef}
            className="mb-6 p-4 bg-gray-50 rounded-lg"
            animate={controls}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                Progress: {completedCount} of {totalCount} completed
              </span>
              <Badge
                variant={completionPercentage === 100 ? 'success' : 'primary'}
              >
                {Math.round(completionPercentage)}%
              </Badge>
            </div>
            <motion.div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
              {/* Animated shine effect */}
              <motion.div
                className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '500%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.div>
            {completionPercentage === 100 && (
              <motion.p
                className="text-sm text-green-600 mt-2 flex items-center space-x-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1, delay: 0.5 }}
                >
                  <CheckCircle className="h-4 w-4" />
                </motion.div>
                <span>Congratulations! You've completed your onboarding.</span>
              </motion.p>
            )}
          </motion.div>

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === null ? 'primary' : 'outline'}
                onClick={() => setSelectedCategory(null)}
              >
                All ({totalCount})
              </Button>
              {Object.entries(categories).map(([key, { label, icon }]) => {
                const categoryCount = checklist.filter(
                  (item) => item.category === key,
                ).length;
                const completedInCategory = checklist.filter(
                  (item) => item.category === key && item.completed,
                ).length;

                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedCategory === key ? 'primary' : 'outline'}
                    onClick={() => setSelectedCategory(key)}
                    className="flex items-center space-x-1"
                  >
                    {icon}
                    <span>
                      {label} ({completedInCategory}/{categoryCount})
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Checklist Items */}
          <motion.div
            className="space-y-3"
            variants={animations.staggerContainer}
            initial="initial"
            animate="animate"
          >
            {getFilteredItems().map((item, index) => (
              <motion.div
                key={item.id}
                className="border border-gray-200 rounded-lg relative"
                variants={animations.staggerItem}
                custom={index}
                layout
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {/* Celebration overlay for completed item */}
                <AnimatePresence>
                  {celebratingItem === item.id && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none z-10 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-lg" />
                      <motion.div
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: [0, 1.2, 0], rotate: 360 }}
                        transition={{ duration: 1 }}
                      >
                        <Star className="w-16 h-16 text-yellow-400" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div
                  className={`
                  p-4 cursor-pointer transition-all duration-200
                  ${
                    item.completed
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-white hover:bg-gray-50'
                  }
                `}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {item.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex items-center space-x-2">
                        <div
                          className={`
                        p-1.5 rounded-md 
                        ${item.completed ? 'bg-green-100' : 'bg-gray-100'}
                      `}
                        >
                          {React.cloneElement(item.icon as React.ReactElement, {
                            className: `h-4 w-4 ${item.completed ? 'text-green-600' : 'text-gray-600'}`,
                          })}
                        </div>
                        <div>
                          <h4
                            className={`font-medium ${item.completed ? 'text-green-900' : 'text-gray-900'}`}
                          >
                            {item.title}
                          </h4>
                          <p
                            className={`text-sm ${item.completed ? 'text-green-700' : 'text-gray-600'}`}
                          >
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {item.estimatedMinutes}min
                        </span>
                      </div>
                      {!item.completed && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartItem(item);
                          }}
                        >
                          Start
                        </Button>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          expandedItem === item.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === item.id && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">
                          Step-by-step instructions:
                        </h5>
                        <ol className="space-y-2">
                          {item.instructions.map((instruction, index) => (
                            <li
                              key={index}
                              className="flex items-start space-x-3"
                            >
                              <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-600 text-xs font-medium rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-700">
                                {instruction}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">
                          Benefits you'll unlock:
                        </h5>
                        <ul className="space-y-2">
                          {item.benefits.map((benefit, index) => (
                            <li
                              key={index}
                              className="flex items-start space-x-2"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700">
                                {benefit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline" size="sm">
                            {categories[item.category].label}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Estimated time: {item.estimatedMinutes} minutes
                          </span>
                        </div>
                        {!item.completed && (
                          <Button
                            variant="primary"
                            onClick={() => handleStartItem(item)}
                          >
                            Get Started
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Completion Celebration */}
          {completionPercentage === 100 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-primary-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">
                    🎉 Onboarding Complete!
                  </h4>
                  <p className="text-sm text-green-700">
                    You've set up the foundation for an efficient wedding
                    planning workflow. Ready to explore advanced features?
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
