'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  articleCount: number;
  subcategories?: Category[];
}

interface UserProgress {
  completedTutorials: string[];
  completedSteps: string[];
  bookmarkedArticles: string[];
  searchHistory: string[];
  lastVisited: {
    articleId?: string;
    tutorialId?: string;
    timestamp: string;
  };
}

export interface KnowledgeBaseNavigationProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
  userProgress?: UserProgress;
  className?: string;
}

export function KnowledgeBaseNavigation({
  categories,
  onCategorySelect,
  userProgress,
  className = '',
}: KnowledgeBaseNavigationProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const renderCategory = useCallback(
    (category: Category, level = 0) => {
      const isExpanded = expandedCategories.has(category.id);
      const hasSubcategories =
        category.subcategories && category.subcategories.length > 0;

      return (
        <div key={category.id} className="mb-1">
          <button
            onClick={() => {
              if (hasSubcategories) {
                toggleCategory(category.id);
              } else {
                onCategorySelect(category.id);
              }
            }}
            className={`w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors duration-200 ${
              level > 0 ? 'ml-4' : ''
            }`}
          >
            <div className="flex items-center flex-1">
              {hasSubcategories ? (
                <>
                  {isExpanded ? (
                    <ChevronDownIcon
                      className="w-4 h-4 text-gray-400 mr-2"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRightIcon
                      className="w-4 h-4 text-gray-400 mr-2"
                      aria-hidden="true"
                    />
                  )}
                  {isExpanded ? (
                    <FolderOpenIcon
                      className="w-4 h-4 text-blue-500 mr-2"
                      aria-hidden="true"
                    />
                  ) : (
                    <FolderIcon
                      className="w-4 h-4 text-blue-500 mr-2"
                      aria-hidden="true"
                    />
                  )}
                </>
              ) : (
                <BookOpenIcon
                  className="w-4 h-4 text-gray-500 mr-2"
                  aria-hidden="true"
                />
              )}

              <span className="font-medium text-gray-900 truncate">
                {category.name}
              </span>
            </div>

            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {category.articleCount}
            </span>
          </button>

          <AnimatePresence>
            {isExpanded && hasSubcategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-4 mt-1"
              >
                {category.subcategories!.map((subcategory) =>
                  renderCategory(subcategory, level + 1),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
    [expandedCategories, toggleCategory, onCategorySelect],
  );

  return (
    <nav className={`p-4 ${className}`} aria-label="Knowledge base navigation">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Browse Categories
        </h2>
        <div className="space-y-1">
          {categories.map((category) => renderCategory(category))}
        </div>
      </div>

      {userProgress && userProgress.bookmarkedArticles.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Bookmarked Articles
          </h3>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 px-3 py-2">
              {userProgress.bookmarkedArticles.length} bookmarked
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
