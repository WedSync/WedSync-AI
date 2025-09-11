'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import MobileCategoryCard from './MobileCategoryCard';
import MobileCategoryTimeline from './MobileCategoryTimeline';
import {
  TaskCategory,
  CategoryGroup,
  CategoryPhase,
} from '@/types/task-categories';
import { cn } from '@/lib/utils';
import {
  PlusIcon,
  AdjustmentsHorizontalIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface MobileCategoryDashboardProps {
  organizationId: string;
  clientId?: string;
  onCategorySelect?: (category: TaskCategory) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list' | 'timeline' | 'phase';

export default function MobileCategoryDashboard({
  organizationId,
  clientId,
  onCategorySelect,
  className,
}: MobileCategoryDashboardProps) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPhase, setSelectedPhase] = useState<CategoryPhase | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Phase definitions for wedding workflow
  const phases: Record<
    CategoryPhase,
    { name: string; color: string; categories: string[] }
  > = {
    setup: {
      name: 'Setup & Planning',
      color: '#8b5cf6',
      categories: ['planning', 'venue', 'legal', 'attire'],
    },
    ceremony: {
      name: 'Ceremony',
      color: '#10b981',
      categories: ['photography', 'music', 'decor'],
    },
    reception: {
      name: 'Reception',
      color: '#f59e0b',
      categories: ['catering', 'guest', 'transportation'],
    },
    breakdown: {
      name: 'Cleanup & Breakdown',
      color: '#ef4444',
      categories: ['venue', 'transportation'],
    },
  };

  // Load categories and task data
  const loadCategories = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch task counts per category
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('category, status')
        .eq('organization_id', organizationId);

      if (tasksError) throw tasksError;

      // Process data into category groups
      const groups = (categoriesData || []).map((category) => {
        const categoryTasks = (tasksData || []).filter(
          (task) => task.category === category.name,
        );

        return {
          category,
          tasks: categoryTasks,
          stats: {
            total: categoryTasks.length,
            completed: categoryTasks.filter((t) => t.status === 'completed')
              .length,
            inProgress: categoryTasks.filter((t) => t.status === 'in_progress')
              .length,
            pending: categoryTasks.filter((t) => t.status === 'pending').length,
            overdue: 0, // Calculate based on due dates
          },
        };
      });

      setCategories(categoriesData || []);
      setCategoryGroups(groups);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, supabase, organizationId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Handle category selection
  const handleCategoryTap = useCallback(
    (category: TaskCategory) => {
      if (isSelectionMode) {
        setSelectedCategories((prev) =>
          prev.includes(category.id)
            ? prev.filter((id) => id !== category.id)
            : [...prev, category.id],
        );
      } else {
        onCategorySelect?.(category);
      }
    },
    [isSelectionMode, onCategorySelect],
  );

  // Handle long press for selection mode
  const handleCategoryLongPress = useCallback(
    (category: TaskCategory) => {
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedCategories([category.id]);

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    },
    [isSelectionMode],
  );

  // Handle swipe actions
  const handleSwipeRight = useCallback((category: TaskCategory) => {
    console.log('Mark category as complete:', category.name);
    // Implement mark as complete logic
  }, []);

  const handleSwipeLeft = useCallback((category: TaskCategory) => {
    console.log('Archive category:', category.name);
    // Implement archive logic
  }, []);

  // Handle sync
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await loadCategories();
    setIsSyncing(false);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }, [loadCategories]);

  // Filter categories by phase
  const filteredGroups = useMemo(() => {
    if (!selectedPhase) return categoryGroups;

    const phaseCategories = phases[selectedPhase].categories;
    return categoryGroups.filter((group) =>
      phaseCategories.includes(group.category.name),
    );
  }, [categoryGroups, selectedPhase, phases]);

  // Render category grid
  const renderGrid = () => (
    <div className="grid grid-cols-2 gap-3 px-4">
      <AnimatePresence mode="popLayout">
        {filteredGroups.map((group, index) => (
          <motion.div
            key={group.category.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
          >
            <MobileCategoryCard
              category={group.category}
              taskCount={group.stats.total}
              completedCount={group.stats.completed}
              onTap={handleCategoryTap}
              onLongPress={handleCategoryLongPress}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              isSelected={selectedCategories.includes(group.category.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  // Render category list
  const renderList = () => (
    <div className="space-y-2 px-4">
      <Reorder.Group
        axis="y"
        values={filteredGroups}
        onReorder={setCategoryGroups}
      >
        {filteredGroups.map((group, index) => (
          <Reorder.Item
            key={group.category.id}
            value={group}
            dragListener={!isSelectionMode}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <MobileCategoryCard
                category={group.category}
                taskCount={group.stats.total}
                completedCount={group.stats.completed}
                onTap={handleCategoryTap}
                onLongPress={handleCategoryLongPress}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                isSelected={selectedCategories.includes(group.category.id)}
                className="w-full"
              />
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );

  // Render timeline view
  const renderTimeline = () => (
    <MobileCategoryTimeline
      categoryGroups={filteredGroups}
      onCategorySelect={handleCategoryTap}
      selectedCategories={selectedCategories}
    />
  );

  // Render phase view
  const renderPhaseView = () => (
    <div className="space-y-4 px-4">
      {Object.entries(phases).map(([phase, config]) => {
        const phaseGroups = categoryGroups.filter((group) =>
          config.categories.includes(group.category.name),
        );
        const totalTasks = phaseGroups.reduce(
          (sum, g) => sum + g.stats.total,
          0,
        );
        const completedTasks = phaseGroups.reduce(
          (sum, g) => sum + g.stats.completed,
          0,
        );

        return (
          <motion.div
            key={phase}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4"
            style={{ borderLeftColor: config.color, borderLeftWidth: '4px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPhase(phase as CategoryPhase)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="font-semibold text-lg"
                style={{ color: config.color }}
              >
                {config.name}
              </h3>
              <span className="text-sm text-gray-500">
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {phaseGroups.map((group) => (
                <div
                  key={group.category.id}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${group.category.color}20`,
                    color: group.category.color,
                  }}
                >
                  {group.category.display_name}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900">Task Categories</h2>
          <div className="flex items-center space-x-2">
            {isSelectionMode ? (
              <>
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedCategories([]);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-purple-600">
                  {selectedCategories.length} selected
                </span>
              </>
            ) : (
              <>
                <button
                  onClick={handleSync}
                  className={cn(
                    'p-2 text-gray-600 hover:bg-gray-100 rounded-lg',
                    isSyncing && 'animate-spin',
                  )}
                  disabled={isSyncing}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
                <button className="p-2 bg-purple-600 text-white rounded-lg">
                  <PlusIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { mode: 'grid' as ViewMode, icon: Squares2X2Icon },
            { mode: 'list' as ViewMode, icon: ListBulletIcon },
            { mode: 'timeline' as ViewMode, icon: ViewColumnsIcon },
            { mode: 'phase' as ViewMode, icon: AdjustmentsHorizontalIcon },
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === mode
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className="w-4 h-4 mx-auto" />
            </button>
          ))}
        </div>

        {/* Phase Filter (shown in non-phase views) */}
        {viewMode !== 'phase' && selectedPhase && (
          <div className="mt-3 flex items-center justify-between p-2 bg-purple-50 rounded-lg">
            <span className="text-sm font-medium text-purple-900">
              Filtered by: {phases[selectedPhase].name}
            </span>
            <button
              onClick={() => setSelectedPhase(null)}
              className="text-purple-600 hover:text-purple-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : (
          <div className="py-4">
            {viewMode === 'grid' && renderGrid()}
            {viewMode === 'list' && renderList()}
            {viewMode === 'timeline' && renderTimeline()}
            {viewMode === 'phase' && renderPhaseView()}
          </div>
        )}
      </div>

      {/* Selection Mode Actions */}
      <AnimatePresence>
        {isSelectionMode && selectedCategories.length > 0 && (
          <motion.div
            className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <div className="flex items-center justify-around">
              <button className="flex flex-col items-center space-y-1 text-gray-600">
                <CheckIcon className="w-6 h-6" />
                <span className="text-xs">Complete</span>
              </button>
              <button className="flex flex-col items-center space-y-1 text-gray-600">
                <AdjustmentsHorizontalIcon className="w-6 h-6" />
                <span className="text-xs">Edit</span>
              </button>
              <button className="flex flex-col items-center space-y-1 text-red-600">
                <XMarkIcon className="w-6 h-6" />
                <span className="text-xs">Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
