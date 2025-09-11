'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface HelpContext {
  page: string;
  articleId?: string;
  tutorialId?: string;
  section?: string;
  userAction?: string;
}

interface HelpSuggestion {
  id: string;
  title: string;
  type: 'article' | 'tutorial' | 'video' | 'contact';
  description: string;
  url?: string;
  priority: number;
}

export interface ContextualHelpWidgetProps {
  currentContext: HelpContext;
  onHelpRequest: (query: string) => void;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

const widgetTransition = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: 20 },
  transition: { duration: 0.2 },
};

const CONTEXTUAL_SUGGESTIONS: Record<string, HelpSuggestion[]> = {
  dashboard: [
    {
      id: 'getting-started',
      title: 'Getting Started Guide',
      type: 'article',
      description: 'Learn the basics of using WedSync',
      priority: 1,
    },
    {
      id: 'navigation-tutorial',
      title: 'Platform Navigation',
      type: 'tutorial',
      description: 'Tour of the main features and menus',
      priority: 2,
    },
  ],
  search: [
    {
      id: 'search-tips',
      title: 'Search Tips & Tricks',
      type: 'article',
      description: 'Get better search results with these techniques',
      priority: 1,
    },
    {
      id: 'filters-guide',
      title: 'Using Search Filters',
      type: 'article',
      description: 'Narrow down results with category and difficulty filters',
      priority: 2,
    },
  ],
};

export function ContextualHelpWidget({
  currentContext,
  onHelpRequest,
  position = 'bottom-right',
  className = '',
}: ContextualHelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'suggestions' | 'search' | 'contact'
  >('suggestions');
  const [searchQuery, setSearchQuery] = useState('');

  const suggestions = CONTEXTUAL_SUGGESTIONS[currentContext.page] || [];

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        onHelpRequest(searchQuery);
        setSearchQuery('');
        setIsOpen(false);
      }
    },
    [searchQuery, onHelpRequest],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: HelpSuggestion) => {
      if (suggestion.url) {
        window.open(suggestion.url, '_blank');
      } else {
        onHelpRequest(suggestion.title);
      }
      setIsOpen(false);
    },
    [onHelpRequest],
  );

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...widgetTransition}
            className="mb-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-primary-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Help & Support</h3>
                <button
                  onClick={handleToggle}
                  className="text-primary-100 hover:text-white transition-colors duration-200"
                  aria-label="Close help widget"
                >
                  <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex mt-3 -mb-px">
                {[
                  {
                    id: 'suggestions',
                    label: 'Suggestions',
                    icon: BookOpenIcon,
                  },
                  { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
                  {
                    id: 'contact',
                    label: 'Contact',
                    icon: ChatBubbleLeftEllipsisIcon,
                  },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
                      activeTab === id
                        ? 'bg-white text-primary-600'
                        : 'text-primary-100 hover:text-white hover:bg-primary-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {activeTab === 'suggestions' && (
                <div className="p-4">
                  {suggestions.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Helpful for this page:
                      </h4>
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {suggestion.type === 'article' && (
                                <BookOpenIcon
                                  className="w-4 h-4 text-primary-600"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {suggestion.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {suggestion.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <BookOpenIcon
                        className="w-8 h-8 text-gray-400 mx-auto mb-2"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-gray-600">
                        No contextual suggestions available for this page.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'search' && (
                <div className="p-4">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <MagnifyingGlassIcon
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search help articles..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        aria-label="Search help articles"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="w-full mt-3 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Search Knowledge Base
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="p-4">
                  <div className="text-center">
                    <ChatBubbleLeftEllipsisIcon
                      className="w-8 h-8 text-gray-400 mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-gray-600">
                      Contact support options would go here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={handleToggle}
        className={`relative w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          isOpen ? 'scale-95' : 'scale-100'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'Close help' : 'Open help'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <XMarkIcon className="w-6 h-6 mx-auto" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <QuestionMarkCircleIcon
                className="w-6 h-6 mx-auto"
                aria-hidden="true"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
