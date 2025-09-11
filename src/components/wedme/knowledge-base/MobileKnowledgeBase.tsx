'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Search,
  Mic,
  BookOpen,
  Clock,
  Wifi,
  WifiOff,
  Heart,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryGrid } from './CategoryGrid';
import { SearchInterface } from './SearchInterface';
import { VoiceSearchInterface } from './VoiceSearchInterface';
import { OfflineIndicator } from './OfflineIndicator';
import { ArticleCard } from './ArticleCard';
import { useOfflineKnowledge } from '@/hooks/useOfflineKnowledge';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  articleCount: number;
  weddingPhase: string;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  weddingTimelineTags: string[];
  estimatedReadTime: number;
  isOfflineAvailable: boolean;
  helpful: number;
  createdAt: string;
}

interface UserProgress {
  completedTasks: number;
  totalTasks: number;
  completionPercentage: number;
}

interface MobileKnowledgeBaseProps {
  categories: KnowledgeCategory[];
  recentArticles: KnowledgeArticle[];
  userProgress?: UserProgress;
  coupleId?: string;
  weddingDate?: string;
}

export function MobileKnowledgeBase({
  categories,
  recentArticles,
  userProgress,
  coupleId,
  weddingDate,
}: MobileKnowledgeBaseProps) {
  const [searchMode, setSearchMode] = useState(false);
  const [voiceSearchMode, setVoiceSearchMode] = useState(false);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isOffline,
    offlineArticles,
    syncWithServer,
    syncInProgress,
    lastSync,
  } = useOfflineKnowledge();

  const {
    startVoiceSearch,
    stopVoiceSearch,
    isListening,
    transcript,
    voiceResults,
    voiceError,
  } = useVoiceSearch();

  // Calculate wedding timeline phase
  const getWeddingPhase = () => {
    if (!weddingDate) return 'planning';

    const today = new Date();
    const wedding = new Date(weddingDate);
    const daysUntil = Math.ceil(
      (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil > 365) return 'early-planning';
    if (daysUntil > 180) return 'active-planning';
    if (daysUntil > 30) return 'final-details';
    if (daysUntil > 0) return 'wedding-week';
    return 'post-wedding';
  };

  const currentPhase = getWeddingPhase();
  const phaseFilters = [
    'Early Planning',
    'Active Planning',
    'Final Details',
    'Wedding Week',
  ];

  const handleVoiceSearch = async () => {
    if (isListening) {
      stopVoiceSearch();
    } else {
      setVoiceSearchMode(true);
      try {
        await startVoiceSearch();
      } catch (error) {
        console.error('Voice search failed:', error);
      }
    }
  };

  const handleVoiceResults = (results: any) => {
    setVoiceSearchMode(false);
    setSearchMode(true);
    setSearchQuery(results.query);
  };

  const handleFilterToggle = (filter: string) => {
    setQuickFilters((prev) =>
      prev.includes(filter.toLowerCase())
        ? prev.filter((f) => f !== filter.toLowerCase())
        : [...prev, filter.toLowerCase()],
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 pb-20">
      {/* Header with search */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-rose-100 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-rose-900">
                Wedding Help Center
              </h1>
              {weddingDate && (
                <p className="text-sm text-rose-600">
                  {Math.ceil(
                    (new Date(weddingDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )}{' '}
                  days until your big day
                </p>
              )}
            </div>
            <OfflineIndicator
              isOffline={isOffline}
              lastSync={lastSync}
              syncInProgress={syncInProgress}
              onSync={syncWithServer}
            />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search wedding help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-3 rounded-full bg-rose-50 border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none transition-colors"
              onFocus={() => setSearchMode(true)}
              style={{ minHeight: '48px' }} // Touch target compliance
            />
            <button
              onClick={handleVoiceSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-rose-100 transition-colors"
              style={{ minWidth: '48px', minHeight: '48px' }} // Touch target compliance
              aria-label="Voice search"
            >
              <Mic
                className={`w-4 h-4 ${isListening ? 'text-rose-600' : 'text-rose-400'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Wedding Phase Filters */}
      <div className="px-4 py-3 bg-white border-b border-rose-100">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {phaseFilters.map((phase) => (
            <button
              key={phase}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                quickFilters.includes(phase.toLowerCase())
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
              }`}
              style={{ minHeight: '48px' }} // Touch target compliance
              onClick={() => handleFilterToggle(phase)}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <AnimatePresence mode="wait">
          {searchMode || searchQuery ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SearchInterface
                query={searchQuery}
                filters={quickFilters}
                onClose={() => {
                  setSearchMode(false);
                  setSearchQuery('');
                }}
                isOffline={isOffline}
                coupleId={coupleId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress Overview */}
              {userProgress && (
                <motion.div
                  className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-rose-100"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center mb-3">
                    <Heart className="w-5 h-5 text-rose-500 mr-2" />
                    <h2 className="text-lg font-semibold text-rose-900">
                      Your Wedding Journey
                    </h2>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-rose-600">
                      {userProgress.completedTasks} of {userProgress.totalTasks}{' '}
                      tasks complete
                    </span>
                    <span className="text-sm text-rose-500 font-medium">
                      {userProgress.completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-rose-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-rose-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${userProgress.completionPercentage}%`,
                      }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                  <p className="text-sm text-rose-600 mt-2">
                    You're doing great! Keep up the momentum.
                  </p>
                </motion.div>
              )}

              {/* Today's Focus - Context Aware */}
              <motion.div
                className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center mb-3">
                  <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-blue-900">
                    Perfect Timing!
                  </h2>
                </div>
                <p className="text-blue-700 mb-3">
                  {currentPhase === 'early-planning' &&
                    "You're in the early planning phase. Focus on the big decisions first."}
                  {currentPhase === 'active-planning' &&
                    "Active planning time! Let's get those vendors booked."}
                  {currentPhase === 'final-details' &&
                    'Final details phase - time to confirm everything!'}
                  {currentPhase === 'wedding-week' &&
                    "It's wedding week! Focus on final confirmations and relaxing."}
                  {currentPhase === 'post-wedding' &&
                    'Congratulations! Time to tie up loose ends and enjoy memories.'}
                </p>

                {/* Phase-specific article recommendations */}
                <div className="space-y-2">
                  {recentArticles
                    .filter((article) =>
                      article.weddingTimelineTags.includes(currentPhase),
                    )
                    .slice(0, 2)
                    .map((article) => (
                      <button
                        key={article.id}
                        className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                        style={{ minHeight: '48px' }} // Touch target compliance
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-blue-900 mb-1">
                            {article.title}
                          </h3>
                          <span className="text-xs text-blue-600 flex-shrink-0 ml-2">
                            {article.estimatedReadTime} min
                          </span>
                        </div>
                        <p className="text-sm text-blue-600">
                          Helpful for {article.helpful}% of couples
                        </p>
                      </button>
                    ))}
                </div>
              </motion.div>

              {/* Category Grid */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CategoryGrid
                  categories={categories}
                  currentPhase={currentPhase}
                  quickFilters={quickFilters}
                />
              </motion.div>

              {/* Recently Updated Articles */}
              {recentArticles.length > 0 && (
                <motion.div
                  className="mt-8"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-lg font-semibold text-rose-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recently Updated
                  </h2>
                  <div className="space-y-3">
                    {recentArticles.slice(0, 5).map((article, index) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <ArticleCard
                          article={article}
                          compact={true}
                          showOfflineStatus={isOffline}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Offline Articles Section */}
              {isOffline && offlineArticles.length > 0 && (
                <motion.div
                  className="mt-8"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-lg font-semibold text-amber-900 mb-4 flex items-center">
                    <WifiOff className="w-5 h-5 mr-2" />
                    Available Offline
                  </h2>
                  <div className="space-y-3">
                    {offlineArticles.slice(0, 3).map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        compact={true}
                        showOfflineStatus={true}
                        offline={true}
                      />
                    ))}
                  </div>
                  <button className="mt-3 text-amber-600 text-sm hover:text-amber-800 transition-colors">
                    View all {offlineArticles.length} offline articles →
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Search Modal */}
      <AnimatePresence>
        {voiceSearchMode && (
          <VoiceSearchInterface
            onResults={handleVoiceResults}
            onClose={() => setVoiceSearchMode(false)}
            isListening={isListening}
            transcript={transcript}
            error={voiceError}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button - Voice Search */}
      <motion.button
        className="fixed bottom-20 right-4 w-14 h-14 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 z-20"
        onClick={handleVoiceSearch}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        aria-label="Voice search"
      >
        <Mic className="w-6 h-6 mx-auto" />
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-rose-500"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.button>
    </div>
  );
}
