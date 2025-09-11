'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback } from 'react';
import {
  PartyPopper,
  Gift,
  Star,
  Heart,
  Trophy,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface TutorialReward {
  id: string;
  type: 'achievement' | 'unlock' | 'discount' | 'bonus';
  title: string;
  description: string;
  value?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface TutorialCelebrationProps {
  /** Whether celebration is visible */
  isVisible: boolean;
  /** Tutorial completion data */
  tutorialType: 'onboarding' | 'feature-discovery' | 'advanced';
  /** Steps completed count */
  completedSteps: number;
  /** Total steps count */
  totalSteps: number;
  /** Time taken to complete (in milliseconds) */
  completionTime?: number;
  /** User achievements earned */
  achievements?: Achievement[];
  /** Rewards earned */
  rewards?: TutorialReward[];
  /** Next recommended actions */
  nextSteps?: Array<{
    title: string;
    description: string;
    action: {
      label: string;
      href?: string;
      onClick?: () => void;
    };
  }>;
  /** Callback when celebration is dismissed */
  onDismiss: () => void;
  /** Callback when user wants to explore features */
  onExploreFeatures?: () => void;
  /** Callback when user wants to start planning */
  onStartPlanning?: () => void;
  /** Custom className */
  className?: string;
}

const confettiColors = [
  '#9E77ED',
  '#7F56D9',
  '#6941C6', // Primary purples
  '#F04438',
  '#D92D20',
  '#B42318', // Error reds
  '#12B76A',
  '#039855',
  '#027A48', // Success greens
  '#F79009',
  '#DC6803',
  '#B54708', // Warning ambers
  '#2E90FA',
  '#1570EF',
  '#175CD3', // Blue accents
];

const defaultAchievements: Achievement[] = [
  {
    id: 'tutorial-complete',
    title: 'Tutorial Master',
    description: 'Completed your first WedSync tutorial',
    icon: Trophy,
    rarity: 'common',
    points: 100,
  },
  {
    id: 'quick-learner',
    title: 'Quick Learner',
    description: 'Completed tutorial in record time',
    icon: Star,
    rarity: 'rare',
    points: 200,
  },
  {
    id: 'wedding-planner',
    title: 'Wedding Planner',
    description: 'Ready to plan your perfect day',
    icon: Heart,
    rarity: 'epic',
    points: 300,
  },
];

const defaultRewards: TutorialReward[] = [
  {
    id: 'premium-trial',
    type: 'unlock',
    title: '7-Day Premium Trial',
    description: 'Unlock all premium features for free',
    value: 'Worth $29.99',
    action: {
      label: 'Activate Now',
      onClick: () => console.log('Activate premium trial'),
    },
  },
  {
    id: 'planning-discount',
    type: 'discount',
    title: '20% Off Planning Services',
    description: 'Discount on our professional planning consultation',
    value: 'Save up to $200',
    action: {
      label: 'Book Session',
      href: '/planning/book',
    },
  },
];

export function TutorialCelebration({
  isVisible,
  tutorialType,
  completedSteps,
  totalSteps,
  completionTime,
  achievements = defaultAchievements,
  rewards = defaultRewards,
  nextSteps = [],
  onDismiss,
  onExploreFeatures,
  onStartPlanning,
  className,
}: TutorialCelebrationProps) {
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentView, setCurrentView] = useState<
    'celebration' | 'achievements' | 'rewards'
  >('celebration');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      // Stop confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const formatCompletionTime = useCallback((ms?: number) => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getTutorialTitle = useCallback((type: string) => {
    switch (type) {
      case 'onboarding':
        return 'Welcome Tutorial';
      case 'feature-discovery':
        return 'Feature Discovery';
      case 'advanced':
        return 'Advanced Training';
      default:
        return 'Tutorial';
    }
  }, []);

  const getRarityColor = useCallback((rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-400 to-yellow-600';
      case 'epic':
        return 'from-purple-400 to-purple-600';
      case 'rare':
        return 'from-blue-400 to-blue-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  }, []);

  if (!mounted) return null;

  const celebrationContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onDismiss()}
        >
          {/* Confetti Animation */}
          <AnimatePresence>
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        confettiColors[i % confettiColors.length],
                      left: `${Math.random() * 100}%`,
                    }}
                    initial={{
                      y: -20,
                      x: 0,
                      rotate: 0,
                      scale: 0,
                    }}
                    animate={{
                      y: window.innerHeight + 20,
                      x: (Math.random() - 0.5) * 200,
                      rotate: 360,
                      scale: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      delay: Math.random() * 2,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Main Celebration Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className={cn(
              'relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden',
              className,
            )}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 p-8 text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              >
                <PartyPopper className="w-16 h-16 mx-auto mb-4" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2"
              >
                Congratulations! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg opacity-90"
              >
                You've completed the {getTutorialTitle(tutorialType)}!
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-4 mt-6"
              >
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {completedSteps}/{totalSteps}
                  </div>
                  <div className="text-sm opacity-80">Steps Completed</div>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-2xl font-bold">
                    {formatCompletionTime(completionTime)}
                  </div>
                  <div className="text-sm opacity-80">Time Taken</div>
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {currentView === 'celebration' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Achievements Preview */}
                  {achievements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Achievements Unlocked
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {achievements.slice(0, 2).map((achievement) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className={cn(
                              'p-3 rounded-lg border-2 bg-gradient-to-r',
                              getRarityColor(achievement.rarity),
                            )}
                          >
                            <div className="flex items-center gap-3 text-white">
                              <achievement.icon className="w-6 h-6" />
                              <div>
                                <div className="font-semibold text-sm">
                                  {achievement.title}
                                </div>
                                <div className="text-xs opacity-90">
                                  +{achievement.points} pts
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {achievements.length > 2 && (
                        <button
                          onClick={() => setCurrentView('achievements')}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                        >
                          View all {achievements.length} achievements →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Rewards Preview */}
                  {rewards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary-500" />
                        Your Rewards
                      </h3>
                      <div className="space-y-3">
                        {rewards.slice(0, 2).map((reward) => (
                          <motion.div
                            key={reward.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {reward.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {reward.description}
                                </p>
                                {reward.value && (
                                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full mt-2">
                                    {reward.value}
                                  </span>
                                )}
                              </div>
                              {reward.action && (
                                <button
                                  onClick={reward.action.onClick}
                                  className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap"
                                >
                                  {reward.action.label}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {rewards.length > 2 && (
                        <button
                          onClick={() => setCurrentView('rewards')}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                        >
                          View all rewards →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Next Steps */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-blue-500" />
                      What's Next?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={onStartPlanning}
                        className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <div className="font-semibold text-gray-900">
                          Start Planning
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Begin planning your wedding
                        </div>
                      </button>
                      <button
                        onClick={onExploreFeatures}
                        className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        <div className="font-semibold text-gray-900">
                          Explore Features
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Discover advanced tools
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'achievements' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      All Achievements
                    </h3>
                    <button
                      onClick={() => setCurrentView('celebration')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Back
                    </button>
                  </div>
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        'p-4 rounded-lg border-l-4 bg-gradient-to-r from-white to-gray-50',
                        achievement.rarity === 'legendary' &&
                          'border-l-yellow-500',
                        achievement.rarity === 'epic' && 'border-l-purple-500',
                        achievement.rarity === 'rare' && 'border-l-blue-500',
                        achievement.rarity === 'common' && 'border-l-gray-500',
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'p-2 rounded-full',
                            achievement.rarity === 'legendary' &&
                              'bg-yellow-100',
                            achievement.rarity === 'epic' && 'bg-purple-100',
                            achievement.rarity === 'rare' && 'bg-blue-100',
                            achievement.rarity === 'common' && 'bg-gray-100',
                          )}
                        >
                          <achievement.icon
                            className={cn(
                              'w-6 h-6',
                              achievement.rarity === 'legendary' &&
                                'text-yellow-600',
                              achievement.rarity === 'epic' &&
                                'text-purple-600',
                              achievement.rarity === 'rare' && 'text-blue-600',
                              achievement.rarity === 'common' &&
                                'text-gray-600',
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {achievement.title}
                            </h4>
                            <span
                              className={cn(
                                'text-xs font-medium px-2 py-1 rounded-full capitalize',
                                achievement.rarity === 'legendary' &&
                                  'bg-yellow-100 text-yellow-800',
                                achievement.rarity === 'epic' &&
                                  'bg-purple-100 text-purple-800',
                                achievement.rarity === 'rare' &&
                                  'bg-blue-100 text-blue-800',
                                achievement.rarity === 'common' &&
                                  'bg-gray-100 text-gray-800',
                              )}
                            >
                              {achievement.rarity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {achievement.description}
                          </p>
                          <div className="text-sm font-medium text-primary-600 mt-2">
                            +{achievement.points} points
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {currentView === 'rewards' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Your Rewards
                    </h3>
                    <button
                      onClick={() => setCurrentView('celebration')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Back
                    </button>
                  </div>
                  {rewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border border-gray-200 rounded-lg bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Gift className="w-4 h-4 text-primary-500" />
                            {reward.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {reward.description}
                          </p>
                          {reward.value && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full mt-2">
                              {reward.value}
                            </span>
                          )}
                        </div>
                        {reward.action && (
                          <button
                            onClick={reward.action.onClick}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap ml-4"
                          >
                            {reward.action.label}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <Sparkles className="w-4 h-4" />
                  You're ready to create your perfect wedding!
                </motion.div>
                <button
                  onClick={onDismiss}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(celebrationContent, document.body);
}
