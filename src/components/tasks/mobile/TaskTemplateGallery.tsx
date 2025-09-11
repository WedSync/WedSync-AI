'use client';

import React, { useState, useMemo } from 'react';
import { TaskTemplate, TaskCategory } from '@/types/tasks';

interface TaskTemplateGalleryProps {
  onTemplateSelect: (template: TaskTemplate) => void;
  selectedCategory?: TaskCategory | 'all';
  searchQuery?: string;
}

const WEDDING_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'venue-booking',
    title: 'Book Wedding Venue',
    description: 'Research and book your dream wedding venue',
    category: 'planning',
    estimatedDuration: 240,
    priority: 'urgent',
    checklist: [
      'Research venues in preferred location',
      'Schedule venue tours',
      'Compare pricing and packages',
      'Check availability for wedding date',
      'Review contract terms',
      'Sign venue contract and pay deposit',
    ],
  },
  {
    id: 'photographer-selection',
    title: 'Choose Wedding Photographer',
    description: 'Find and book your wedding photographer',
    category: 'planning',
    estimatedDuration: 180,
    priority: 'high',
    checklist: [
      'Research photographers in your area',
      'Review portfolios and styles',
      'Meet with top 3 candidates',
      'Compare packages and pricing',
      'Check availability',
      'Book photographer and sign contract',
    ],
  },
  {
    id: 'menu-tasting',
    title: 'Schedule Menu Tasting',
    description: 'Finalize your wedding menu with caterer',
    category: 'detail',
    estimatedDuration: 120,
    priority: 'high',
    checklist: [
      'Schedule tasting appointment',
      'Consider dietary restrictions',
      'Taste appetizers, mains, and desserts',
      'Select wine pairings',
      'Finalize guest count for catering',
      'Confirm menu selections',
    ],
  },
  {
    id: 'rehearsal-coordination',
    title: 'Coordinate Wedding Rehearsal',
    description: 'Plan and execute wedding rehearsal',
    category: 'final',
    estimatedDuration: 180,
    priority: 'high',
    checklist: [
      'Confirm rehearsal location and time',
      'Create rehearsal timeline',
      'Notify wedding party and family',
      'Prepare ceremony run-through',
      'Plan rehearsal dinner',
      'Review any last-minute changes',
    ],
  },
];

export const TaskTemplateGallery: React.FC<TaskTemplateGalleryProps> = ({
  onTemplateSelect,
  selectedCategory = 'all',
  searchQuery = '',
}) => {
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>(
    selectedCategory,
  );

  const filteredTemplates = useMemo(() => {
    let filtered = WEDDING_TASK_TEMPLATES;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(
        (template) => template.category === activeCategory,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.title.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [activeCategory, searchQuery]);

  const categoryStats = useMemo(() => {
    return WEDDING_TASK_TEMPLATES.reduce(
      (stats, template) => {
        stats[template.category] = (stats[template.category] || 0) + 1;
        return stats;
      },
      {} as Record<TaskCategory, number>,
    );
  }, []);

  const handleCategoryChange = (category: TaskCategory | 'all') => {
    setActiveCategory(category);
    if ('vibrate' in navigator) navigator.vibrate(30);
  };

  const handleTemplateSelect = (template: TaskTemplate) => {
    if ('vibrate' in navigator) navigator.vibrate([50, 25, 50]);
    onTemplateSelect(template);
  };

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case 'planning':
        return '📅';
      case 'detail':
        return '✨';
      case 'final':
        return '🎯';
      default:
        return '📋';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="task-template-gallery">
      {/* Category Filter */}
      <div className="flex overflow-x-auto gap-2 p-4 pb-6">
        <button
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full border-2 transition-all touch-manipulation ${
            activeCategory === 'all'
              ? 'border-primary-600 bg-primary-50 text-primary-700'
              : 'border-gray-300 bg-white text-gray-700'
          }`}
          style={{ minHeight: '40px' }}
          onClick={() => handleCategoryChange('all')}
        >
          All ({WEDDING_TASK_TEMPLATES.length})
        </button>

        {(['planning', 'detail', 'final'] as TaskCategory[]).map((category) => (
          <button
            key={category}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full border-2 transition-all touch-manipulation ${
              activeCategory === category
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-300 bg-white text-gray-700'
            }`}
            style={{ minHeight: '40px' }}
            onClick={() => handleCategoryChange(category)}
          >
            {getCategoryIcon(category)}{' '}
            {category.charAt(0).toUpperCase() + category.slice(1)} (
            {categoryStats[category] || 0})
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 p-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer touch-manipulation"
            onClick={() => handleTemplateSelect(template)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === 'Enter' && handleTemplateSelect(template)
            }
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getCategoryIcon(template.category)}
                </span>
                <span className="text-sm text-gray-600 capitalize">
                  {template.category}
                </span>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(template.priority)}`}
              >
                {template.priority}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {template.title}
            </h3>

            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span>
                  ⏱️ {Math.floor(template.estimatedDuration / 60)}h{' '}
                  {template.estimatedDuration % 60}m
                </span>
                {template.checklist && (
                  <span>✓ {template.checklist.length} steps</span>
                )}
              </div>
            </div>

            <button className="w-full mt-4 py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 touch-manipulation">
              Use This Template
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-sm text-gray-600">
            Try adjusting your search or category filter
          </p>
        </div>
      )}
    </div>
  );
};
