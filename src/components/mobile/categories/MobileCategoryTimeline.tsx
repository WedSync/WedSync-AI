'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryGroup, TaskCategory } from '@/types/task-categories';
import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface MobileCategoryTimelineProps {
  categoryGroups: CategoryGroup[];
  onCategorySelect?: (category: TaskCategory) => void;
  selectedCategories?: string[];
  className?: string;
}

interface TimelinePhase {
  name: string;
  date: string;
  categories: CategoryGroup[];
  totalTasks: number;
  completedTasks: number;
}

export default function MobileCategoryTimeline({
  categoryGroups,
  onCategorySelect,
  selectedCategories = [],
  className,
}: MobileCategoryTimelineProps) {
  // Group categories by wedding timeline phases
  const timelinePhases: TimelinePhase[] = useMemo(() => {
    const phases = [
      {
        name: '12+ Months Before',
        date: 'Planning Phase',
        categoryNames: ['planning', 'venue', 'legal'],
      },
      {
        name: '9-12 Months Before',
        date: 'Booking Phase',
        categoryNames: ['photography', 'catering', 'music'],
      },
      {
        name: '6-9 Months Before',
        date: 'Design Phase',
        categoryNames: ['attire', 'decor', 'guest'],
      },
      {
        name: '3-6 Months Before',
        date: 'Finalization Phase',
        categoryNames: ['transportation', 'guest'],
      },
      {
        name: '1-3 Months Before',
        date: 'Confirmation Phase',
        categoryNames: ['venue', 'catering', 'photography'],
      },
      {
        name: 'Wedding Week',
        date: 'Execution Phase',
        categoryNames: ['venue', 'decor', 'transportation'],
      },
    ];

    return phases.map((phase) => {
      const phaseCategories = categoryGroups.filter((group) =>
        phase.categoryNames.includes(group.category.name),
      );

      const totalTasks = phaseCategories.reduce(
        (sum, group) => sum + group.stats.total,
        0,
      );
      const completedTasks = phaseCategories.reduce(
        (sum, group) => sum + group.stats.completed,
        0,
      );

      return {
        name: phase.name,
        date: phase.date,
        categories: phaseCategories,
        totalTasks,
        completedTasks,
      };
    });
  }, [categoryGroups]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalTasks = categoryGroups.reduce(
      (sum, g) => sum + g.stats.total,
      0,
    );
    const completedTasks = categoryGroups.reduce(
      (sum, g) => sum + g.stats.completed,
      0,
    );
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  }, [categoryGroups]);

  const getPhaseStatus = (phase: TimelinePhase) => {
    const completionRate =
      phase.totalTasks > 0
        ? (phase.completedTasks / phase.totalTasks) * 100
        : 0;

    if (completionRate === 100) return 'completed';
    if (completionRate > 50) return 'in-progress';
    if (completionRate > 0) return 'started';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'started':
        return <CalendarIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'started':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className={cn('px-4 py-6', className)}>
      {/* Overall Progress Header */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Wedding Timeline
          </h3>
          <span className="text-sm font-medium text-purple-600">
            {Math.round(overallProgress)}% Complete
          </span>
        </div>
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-300" />

        {/* Timeline Phases */}
        <AnimatePresence>
          {timelinePhases.map((phase, index) => {
            const status = getPhaseStatus(phase);
            const isExpanded = phase.categories.length > 0;

            return (
              <motion.div
                key={phase.name}
                className="relative mb-8 last:mb-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Timeline Node */}
                <div className="absolute left-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center',
                      getStatusColor(status),
                    )}
                  >
                    {getStatusIcon(status)}
                  </div>
                </div>

                {/* Content */}
                <div className="ml-16">
                  {/* Phase Header */}
                  <div className="mb-3">
                    <h4 className="text-base font-semibold text-gray-900">
                      {phase.name}
                    </h4>
                    <p className="text-sm text-gray-500">{phase.date}</p>
                    {phase.totalTasks > 0 && (
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-green-600">
                          {phase.completedTasks} completed
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {phase.totalTasks - phase.completedTasks} remaining
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Categories in this phase */}
                  {isExpanded && (
                    <motion.div
                      className="space-y-2"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                    >
                      {phase.categories.map((group) => {
                        const isSelected = selectedCategories.includes(
                          group.category.id,
                        );
                        const completionRate =
                          group.stats.total > 0
                            ? (group.stats.completed / group.stats.total) * 100
                            : 0;

                        return (
                          <motion.button
                            key={group.category.id}
                            className={cn(
                              'w-full text-left p-3 rounded-xl border transition-all',
                              isSelected
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-gray-300',
                            )}
                            onClick={() => onCategorySelect?.(group.category)}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: group.category.color,
                                  }}
                                />
                                <span className="text-sm font-medium text-gray-900">
                                  {group.category.display_name}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {group.stats.completed}/{group.stats.total}
                              </span>
                            </div>
                            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${completionRate}%`,
                                  backgroundColor: group.category.color,
                                }}
                              />
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Timeline End */}
        <div className="relative">
          <div className="absolute left-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-4 border-white shadow-md flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="ml-16 pt-2">
            <h4 className="text-base font-semibold text-gray-900">
              Wedding Day!
            </h4>
            <p className="text-sm text-gray-500">The big celebration</p>
          </div>
        </div>
      </div>
    </div>
  );
}
