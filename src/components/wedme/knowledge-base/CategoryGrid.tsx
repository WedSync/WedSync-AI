'use client';

import {
  Heart,
  Calendar,
  Camera,
  Music,
  Utensils,
  MapPin,
  Users,
  Sparkles,
  DollarSign,
  Cake,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const categoryIcons = {
  planning: Heart,
  timeline: Calendar,
  photography: Camera,
  music: Music,
  catering: Utensils,
  venue: MapPin,
  guests: Users,
  flowers: Sparkles,
  budget: DollarSign,
  cake: Cake,
};

interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  articleCount: number;
  weddingPhase: string;
}

interface CategoryGridProps {
  categories: KnowledgeCategory[];
  currentPhase?: string;
  quickFilters?: string[];
}

export function CategoryGrid({
  categories,
  currentPhase,
  quickFilters = [],
}: CategoryGridProps) {
  // Sort categories by relevance to current wedding phase
  const sortedCategories = [...categories].sort((a, b) => {
    const aRelevant = currentPhase && a.weddingPhase === currentPhase;
    const bRelevant = currentPhase && b.weddingPhase === currentPhase;

    if (aRelevant && !bRelevant) return -1;
    if (!aRelevant && bRelevant) return 1;

    // Secondary sort by article count
    return b.articleCount - a.articleCount;
  });

  // Filter categories if quick filters are active
  const filteredCategories =
    quickFilters.length > 0
      ? sortedCategories.filter((category) =>
          quickFilters.some(
            (filter) =>
              category.weddingPhase?.toLowerCase().includes(filter) ||
              category.name.toLowerCase().includes(filter),
          ),
        )
      : sortedCategories;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-900">
          Browse by Category
        </h2>
        {quickFilters.length > 0 && (
          <span className="text-sm text-rose-600">
            {filteredCategories.length} of {categories.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredCategories.map((category, index) => {
          const IconComponent =
            categoryIcons[category.icon as keyof typeof categoryIcons] || Heart;
          const isRelevant =
            currentPhase && category.weddingPhase === currentPhase;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/knowledge/${category.slug}`}
                className="group block"
              >
                <motion.div
                  className={`bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md ${
                    isRelevant
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-rose-100 hover:border-rose-200'
                  }`}
                  style={{ minHeight: '120px' }} // Ensure adequate touch target
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex flex-col items-center text-center h-full justify-center">
                    <motion.div
                      className={`mb-3 p-3 rounded-2xl transition-colors ${
                        isRelevant
                          ? 'bg-rose-200 group-hover:bg-rose-300'
                          : 'bg-rose-100 group-hover:bg-rose-200'
                      }`}
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <IconComponent
                        className={`w-6 h-6 ${
                          isRelevant ? 'text-rose-700' : 'text-rose-600'
                        }`}
                      />
                    </motion.div>

                    <h3
                      className={`font-semibold mb-1 ${
                        isRelevant ? 'text-rose-900' : 'text-rose-900'
                      }`}
                    >
                      {category.name}
                    </h3>

                    <div className="flex items-center space-x-2 text-sm">
                      <span
                        className={`${
                          isRelevant ? 'text-rose-700' : 'text-rose-600'
                        }`}
                      >
                        {category.articleCount} articles
                      </span>

                      {isRelevant && (
                        <motion.span
                          className="px-2 py-1 bg-rose-500 text-white text-xs rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          Relevant Now
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Helpful Tips Section */}
      <motion.div
        className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Sparkles className="w-4 h-4 mr-2" />
          Did You Know?
        </h3>
        <p className="text-sm text-blue-700 mb-2">
          {currentPhase === 'early-planning' &&
            "Start with venue and date - they'll influence all your other decisions!"}
          {currentPhase === 'active-planning' &&
            'Book your photographer early - the best ones get booked 12+ months ahead.'}
          {currentPhase === 'final-details' &&
            'Create a day-of timeline and share it with all your vendors.'}
          {currentPhase === 'wedding-week' &&
            'Delegate tasks to your wedding party - you should be relaxing!'}
          {!currentPhase &&
            'Tap any category to explore helpful articles for your wedding planning journey.'}
        </p>
        <div className="flex items-center text-xs text-blue-600">
          <Heart className="w-3 h-3 mr-1" />
          <span>From couples who've been there</span>
        </div>
      </motion.div>

      {/* Emergency Help Section */}
      <motion.div
        className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="font-semibold text-amber-900 mb-2">
          Need Help Right Now?
        </h3>
        <p className="text-sm text-amber-700 mb-3">
          Feeling stressed or overwhelmed? We're here to help.
        </p>
        <Link
          href="/knowledge/emergency-help"
          className="inline-flex items-center px-4 py-2 bg-amber-200 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-300 transition-colors"
          style={{ minHeight: '48px' }} // Touch target compliance
        >
          <Heart className="w-4 h-4 mr-2" />
          Get Immediate Support
        </Link>
      </motion.div>

      {/* No Results State */}
      {filteredCategories.length === 0 && quickFilters.length > 0 && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles className="w-12 h-12 text-rose-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-rose-900 mb-2">
            No categories match your filters
          </h3>
          <p className="text-rose-600 mb-4">
            Try adjusting your filters or browse all categories
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors"
            style={{ minHeight: '48px' }}
          >
            Show All Categories
          </button>
        </motion.div>
      )}
    </div>
  );
}
