'use client';

import { useState } from 'react';
import {
  Clock,
  Heart,
  Bookmark,
  Share2,
  Tag,
  WifiOff,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

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

interface ArticleCardProps {
  article: KnowledgeArticle;
  compact?: boolean;
  showOfflineStatus?: boolean;
  offline?: boolean;
  highlightQuery?: string;
  onBookmark?: (articleId: string) => void;
  onShare?: (article: KnowledgeArticle) => void;
}

export function ArticleCard({
  article,
  compact = false,
  showOfflineStatus = false,
  offline = false,
  highlightQuery = '',
  onBookmark,
  onShare,
}: ArticleCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Highlight search terms in title and excerpt
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 text-yellow-900 px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      // Toggle bookmark state
      const newBookmarkState = !isBookmarked;
      setIsBookmarked(newBookmarkState);

      // Call parent handler if provided
      if (onBookmark) {
        await onBookmark(article.id);
      }

      // Store in local storage for persistence
      const bookmarks = JSON.parse(
        localStorage.getItem('wedme-bookmarks') || '[]',
      );
      if (newBookmarkState) {
        bookmarks.push(article.id);
      } else {
        const index = bookmarks.indexOf(article.id);
        if (index > -1) bookmarks.splice(index, 1);
      }
      localStorage.setItem('wedme-bookmarks', JSON.stringify(bookmarks));
    } catch (error) {
      // Revert on error
      setIsBookmarked(!isBookmarked);
      console.error('Bookmark error:', error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(article);
    } else if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: `/knowledge/${article.category}/${article.slug}`,
      });
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/knowledge/${article.category}/${article.slug}`;
      navigator.clipboard.writeText(url);
    }
  };

  const getWeddingPhaseColor = (phases: string[]) => {
    if (phases.includes('wedding-week')) return 'text-red-600 bg-red-100';
    if (phases.includes('final-details'))
      return 'text-orange-600 bg-orange-100';
    if (phases.includes('active-planning')) return 'text-blue-600 bg-blue-100';
    if (phases.includes('early-planning')) return 'text-green-600 bg-green-100';
    return 'text-purple-600 bg-purple-100';
  };

  const getWeddingPhaseLabel = (phases: string[]) => {
    if (phases.includes('wedding-week')) return 'Wedding Week';
    if (phases.includes('final-details')) return 'Final Details';
    if (phases.includes('active-planning')) return 'Active Planning';
    if (phases.includes('early-planning')) return 'Early Planning';
    return 'General';
  };

  if (compact) {
    return (
      <motion.article
        className={`bg-white rounded-lg border transition-all duration-200 hover:shadow-md ${
          offline
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-rose-100 hover:border-rose-200'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Link
          href={`/knowledge/${article.category}/${article.slug}`}
          className="block p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <h3
              className={`font-semibold line-clamp-2 ${
                offline ? 'text-amber-900' : 'text-rose-900'
              }`}
            >
              {highlightText(article.title, highlightQuery)}
            </h3>

            <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
              {offline && <WifiOff className="w-3 h-3 text-amber-500" />}
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {article.estimatedReadTime}m
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {highlightText(article.excerpt, highlightQuery)}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                {article.helpful}% helpful
              </span>
              {article.weddingTimelineTags.length > 0 && (
                <span
                  className={`px-2 py-1 rounded-full text-xs ${getWeddingPhaseColor(article.weddingTimelineTags)}`}
                >
                  {getWeddingPhaseLabel(article.weddingTimelineTags)}
                </span>
              )}
            </div>

            {showOfflineStatus && article.isOfflineAvailable && (
              <span className="text-xs text-green-600 font-medium">
                Available offline
              </span>
            )}
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md ${
        offline
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-rose-100 hover:border-rose-200'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      layout
    >
      {/* Header with Category & Status */}
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-rose-600 bg-rose-100 px-2 py-1 rounded-full">
            {article.category}
          </span>
          {offline && (
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full flex items-center">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {article.estimatedReadTime} min read
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Link href={`/knowledge/${article.category}/${article.slug}`}>
          <h2
            className={`text-lg font-bold mb-2 hover:underline line-clamp-3 ${
              offline ? 'text-amber-900' : 'text-rose-900'
            }`}
          >
            {highlightText(article.title, highlightQuery)}
          </h2>
        </Link>

        <p className="text-gray-700 line-clamp-3 mb-4">
          {highlightText(article.excerpt, highlightQuery)}
        </p>

        {/* Wedding Phase Tags */}
        {article.weddingTimelineTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {article.weddingTimelineTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-1 rounded-full text-xs font-medium ${getWeddingPhaseColor([tag])}`}
              >
                {getWeddingPhaseLabel([tag])}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 pt-0 border-t border-gray-100">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Heart className="w-4 h-4 mr-1 text-rose-400" />
            {article.helpful}% found helpful
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bookmark Button */}
          <motion.button
            onClick={handleBookmark}
            disabled={bookmarkLoading}
            className={`p-2 rounded-full transition-colors ${
              isBookmarked
                ? 'bg-rose-100 text-rose-600'
                : 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-600'
            } disabled:opacity-50`}
            style={{ minWidth: '40px', minHeight: '40px' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Bookmark
              className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`}
            />
          </motion.button>

          {/* Share Button */}
          <motion.button
            onClick={handleShare}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            style={{ minWidth: '40px', minHeight: '40px' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Share2 className="w-4 h-4" />
          </motion.button>

          {/* Read Article Button */}
          <Link href={`/knowledge/${article.category}/${article.slug}`}>
            <motion.button
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                offline
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}
              style={{ minHeight: '40px' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Read</span>
              <ExternalLink className="w-3 h-3" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
